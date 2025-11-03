import { Connection, PublicKey, SystemProgram, Transaction, Keypair, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Solana transaction fee constants
 * Base fee per signature: 5,000 lamports = 0.000005 SOL
 * Rent-exempt minimum for system accounts: ~890,880 lamports = 0.00089088 SOL
 */
const BASE_TRANSACTION_FEE_LAMPORTS = 5_000; // 0.000005 SOL per signature
const BASE_TRANSACTION_FEE_SOL = BASE_TRANSACTION_FEE_LAMPORTS / LAMPORTS_PER_SOL;

/**
 * Calculate the minimum rent-exempt balance required for an account
 * For system accounts (wallets), this is typically ~890,880 lamports
 */
async function getRentExemptMinimum(connection: Connection): Promise<number> {
  try {
    // Get minimum rent-exempt balance for a system account (0 bytes data)
    // This is the minimum needed to keep an account open
    const rentExemptBalance = await connection.getMinimumBalanceForRentExemption(0);
    return rentExemptBalance / LAMPORTS_PER_SOL;
  } catch (error) {
    // Fallback to known value if RPC fails
    console.warn('[Payout] Could not fetch rent-exempt minimum, using fallback');
    return 0.00089088; // ~890,880 lamports
  }
}

/**
 * Calculate the actual reserve amount needed for a transaction
 * This includes: rent-exempt balance + transaction fees + safety buffer
 */
export async function calculateRequiredReserve(
  treasuryKeypair: Keypair,
  transactionFeeBuffer: number = 0.0001 // Small buffer for fee variations
): Promise<number> {
  const connection = createConnection();
  
  // Get rent-exempt minimum (keeps treasury account open)
  const rentExemptMinimum = await getRentExemptMinimum(connection);
  
  // Transaction fee (base fee per signature)
  const transactionFee = BASE_TRANSACTION_FEE_SOL;
  
  // Total reserve needed
  const totalReserve = rentExemptMinimum + transactionFee + transactionFeeBuffer;
  
  console.log(`[Reserve] Calculated reserve: ${totalReserve.toFixed(6)} SOL (rent: ${rentExemptMinimum.toFixed(6)}, fee: ${transactionFee.toFixed(6)}, buffer: ${transactionFeeBuffer.toFixed(6)})`);
  
  return totalReserve;
}

/**
 * Create a connection to Solana RPC
 */
function createConnection(): Connection {
  const rpcUrl = process.env.VITE_SOLANA_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

/**
 * Get treasury balance
 */
export async function getTreasuryBalance(treasuryKeypair: Keypair): Promise<number> {
  const connection = createConnection();
  const balance = await connection.getBalance(treasuryKeypair.publicKey);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Send SOL payout to a winner's wallet address
 * Checks treasury balance and calculates actual reserve needed (rent + fees)
 */
export async function sendPayout(
  treasuryKeypair: Keypair,
  recipientAddress: string,
  amountSOL: number
): Promise<string> {
  const connection = createConnection();
  const recipientPubkey = new PublicKey(recipientAddress);
  
  // Calculate actual reserve needed (rent-exempt + transaction fees + buffer)
  const requiredReserve = await calculateRequiredReserve(treasuryKeypair);
  
  // Check treasury balance - we need enough to send the payout AND keep the reserve
  const treasuryBalance = await getTreasuryBalance(treasuryKeypair);
  const requiredAmount = amountSOL + requiredReserve;
  
  if (treasuryBalance < requiredAmount) {
    const available = Math.max(0, treasuryBalance - requiredReserve);
    throw new Error(
      `Insufficient treasury balance. Required: ${requiredAmount.toFixed(6)} SOL (${amountSOL.toFixed(6)} payout + ${requiredReserve.toFixed(6)} reserve). ` +
      `Treasury has: ${treasuryBalance.toFixed(6)} SOL. ` +
      `Maximum payout available: ${available.toFixed(6)} SOL.`
    );
  }
  
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: treasuryKeypair.publicKey,
      toPubkey: recipientPubkey,
      lamports: amountSOL * LAMPORTS_PER_SOL,
    })
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [treasuryKeypair],
    {
      commitment: 'confirmed',
    }
  );

  return signature;
}

/**
 * Send batched SOL payouts (up to ~1232 transfers per transaction)
 * Solana transactions have size limits, so we batch multiple transfers into single transactions
 */
async function sendBatchedPayouts(
  treasuryKeypair: Keypair,
  payouts: Array<{ walletAddress: string; amountSOL: number }>,
  batchSize: number = 1200 // Conservative limit (Solana max is ~1232)
): Promise<Array<{ walletAddress: string; amountSOL: number; txSignature: string | null; error?: string }>> {
  const connection = createConnection();
  const results: Array<{ walletAddress: string; amountSOL: number; txSignature: string | null; error?: string }> = [];
  
  // Process payouts in batches
  for (let i = 0; i < payouts.length; i += batchSize) {
    const batch = payouts.slice(i, i + batchSize);
    const transaction = new Transaction();
    
    // Add all transfers in this batch to one transaction
    const batchResults: Array<{ walletAddress: string; amountSOL: number; index: number }> = [];
    
    for (const payout of batch) {
      try {
        const recipientPubkey = new PublicKey(payout.walletAddress);
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: treasuryKeypair.publicKey,
            toPubkey: recipientPubkey,
            lamports: Math.floor(payout.amountSOL * LAMPORTS_PER_SOL),
          })
        );
        batchResults.push({
          walletAddress: payout.walletAddress,
          amountSOL: payout.amountSOL,
          index: batchResults.length,
        });
      } catch (error: any) {
        // Invalid address - skip this payout
        console.error(`[Payout] Invalid address ${payout.walletAddress}:`, error);
        results.push({
          walletAddress: payout.walletAddress,
          amountSOL: payout.amountSOL,
          txSignature: null,
          error: `Invalid address: ${error.message}`,
        });
      }
    }
    
    // If batch has transfers, send the transaction
    if (transaction.instructions.length > 0) {
      try {
        // Check treasury balance before attempting payout
        const treasuryBalance = await connection.getBalance(treasuryKeypair.publicKey);
        const totalPayoutLamports = batchResults.reduce((sum, r) => sum + Math.floor(r.amountSOL * LAMPORTS_PER_SOL), 0);
        
        // Estimate transaction fee (roughly 5000 lamports per transaction, but we'll use 10000 for safety)
        const estimatedFee = 10000;
        const requiredBalance = totalPayoutLamports + estimatedFee;
        
        if (treasuryBalance < requiredBalance) {
          const missing = (requiredBalance - treasuryBalance) / LAMPORTS_PER_SOL;
          throw new Error(`Insufficient treasury balance. Need ${(requiredBalance / LAMPORTS_PER_SOL).toFixed(9)} SOL, have ${(treasuryBalance / LAMPORTS_PER_SOL).toFixed(9)} SOL (missing ${missing.toFixed(9)} SOL)`);
        }
        
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [treasuryKeypair],
          {
            commitment: 'confirmed',
            skipPreflight: false,
          }
        );
        
        // All payouts in this batch succeeded with the same transaction
        for (const batchResult of batchResults) {
          results.push({
            walletAddress: batchResult.walletAddress,
            amountSOL: batchResult.amountSOL,
            txSignature: signature,
          });
        }
        
        console.log(`[Payout] Batch ${Math.floor(i / batchSize) + 1}: Successfully sent ${batchResults.length} payouts in one transaction (${signature})`);
      } catch (error: any) {
        // Entire batch failed - mark all as failed with detailed error
        const errorMessage = error.message || 'Transaction failed';
        console.error(`[Payout] Batch ${Math.floor(i / batchSize) + 1} failed:`, errorMessage);
        for (const batchResult of batchResults) {
          results.push({
            walletAddress: batchResult.walletAddress,
            amountSOL: batchResult.amountSOL,
            txSignature: null,
            error: errorMessage,
          });
        }
      }
    }
  }
  
  return results;
}

/**
 * Distribute payouts to multiple winners
 * Uses batching for efficiency - combines up to ~1200 payouts per transaction
 */
export async function distributePayouts(
  treasuryKeypair: Keypair,
  payouts: Array<{ walletAddress: string; amountSOL: number }>
): Promise<Array<{ walletAddress: string; amountSOL: number; txSignature: string | null; error?: string }>> {
  if (payouts.length === 0) {
    return [];
  }
  
  // For small numbers of payouts, batch them all together
  // For larger numbers, use batching (which handles it automatically)
  console.log(`[Payout] Distributing ${payouts.length} payout(s) using batched transactions...`);
  
  // Use batched payouts (handles both small and large cases efficiently)
  return await sendBatchedPayouts(treasuryKeypair, payouts);
}

/**
 * Create treasury keypair from environment variable or generate warning
 */
export function getTreasuryKeypair(): Keypair | null {
  const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY;
  
  if (!treasuryPrivateKey) {
    console.warn('[Payout] TREASURY_PRIVATE_KEY not set. On-chain payouts disabled.');
    return null;
  }

  try {
    // Private key can be in hex format (128 chars = 64 bytes) or base58
    let secretKey: Uint8Array;
    
    if (treasuryPrivateKey.length === 128) {
      // Hex format (64 bytes = 128 hex chars)
      secretKey = Buffer.from(treasuryPrivateKey, 'hex');
    } else {
      // Try as base58 (Solana format - more compact)
      secretKey = bs58.decode(treasuryPrivateKey);
    }
    
    // Solana keypairs use 64-byte secret keys
    if (secretKey.length !== 64) {
      throw new Error(`Invalid secret key length: ${secretKey.length} (expected 64)`);
    }
    
    return Keypair.fromSecretKey(secretKey);
  } catch (error: any) {
    console.error('[Payout] Failed to parse treasury private key:', error.message || error);
    return null;
  }
}

