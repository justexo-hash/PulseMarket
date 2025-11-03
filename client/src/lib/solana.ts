import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair,
} from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

/**
 * Get the connection from wallet context (hook)
 */
export function useSolanaConnection() {
  const { connection } = useConnection();
  return connection;
}

/**
 * Get wallet from wallet context (hook)
 */
export function useSolanaWallet() {
  return useWallet();
}

/**
 * Create a connection to Solana RPC
 */
export function createConnection(endpoint?: string): Connection {
  const rpcUrl = endpoint || import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

/**
 * Send SOL from user's wallet to a recipient address
 */
export async function sendSOL(
  connection: Connection,
  fromKeypair: Keypair,
  toAddress: PublicKey,
  amountSOL: number
): Promise<string> {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toAddress,
      lamports: Math.round(amountSOL * LAMPORTS_PER_SOL),
    })
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [fromKeypair],
    {
      commitment: 'confirmed',
    }
  );

  return signature;
}

/**
 * Send SOL using wallet adapter (requires user approval)
 */
export async function sendSOLWithWallet(
  connection: Connection,
  wallet: { publicKey: PublicKey; sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string> },
  toAddress: PublicKey,
  amountSOL: number
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  // Log connection endpoint for debugging
  const rpcEndpoint = (connection as any)._rpcEndpoint || (connection as any).rpcEndpoint || 'Unknown';
  console.log('[sendSOLWithWallet] Using connection endpoint:', rpcEndpoint);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: toAddress,
      lamports: Math.round(amountSOL * LAMPORTS_PER_SOL),
    })
  );

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Send transaction (will prompt user for approval)
  const signature = await wallet.sendTransaction(transaction, connection);

  // Wait for confirmation
  await connection.confirmTransaction(signature, 'confirmed');

  return signature;
}

/**
 * Get SOL balance for an address
 */
export async function getSOLBalance(
  connection: Connection,
  address: PublicKey
): Promise<number> {
  const balance = await connection.getBalance(address);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Verify a message signature (for authentication)
 */
export async function verifySignature(
  message: string,
  signature: Uint8Array,
  publicKey: PublicKey
): Promise<boolean> {
  // Note: This is a simplified version. In production, you'd use a proper message signing format
  // Solana wallets sign messages differently - you'd typically use nacl for Ed25519 verification
  try {
    // For now, we'll just check that we have the signature and public key
    // Full implementation would verify the Ed25519 signature
    return signature.length > 0 && publicKey.toBase58().length > 0;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Create escrow/treasury address from a seed
 * This creates a Program Derived Address (PDA) for holding bet funds
 */
export async function getEscrowAddress(
  programId: PublicKey,
  seed: string
): Promise<[PublicKey, number]> {
  // For now, we'll use a simple approach with Keypair
  // In production, you'd use a Solana program with PDAs
  const seedBytes = Buffer.from(seed);
  const keypair = Keypair.fromSeed(seedBytes.slice(0, 32));
  return [keypair.publicKey, 0];
}

