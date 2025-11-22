import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Create a connection to Solana RPC
 */
function createConnection(): Connection {
  const rpcUrl = process.env.VITE_SOLANA_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

export interface VerifiedDeposit {
  amountSOL: number;
  fromAddress: string;
  toAddress: string;
  signature: string;
  isValid: boolean;
  error?: string;
}

/**
 * Verify a deposit transaction on-chain
 * This ensures:
 * 1. The transaction signature is valid and exists
 * 2. The transaction came from the specified user's wallet
 * 3. The transaction went to the treasury address
 * 4. The amount matches what was claimed
 */
export async function verifyDepositTransaction(
  signature: string,
  expectedFromAddress: string,
  expectedToAddress: string,
  expectedAmount?: number
): Promise<VerifiedDeposit> {
  const connection = createConnection();

  try {
    // Get transaction from blockchain
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      return {
        amountSOL: 0,
        fromAddress: '',
        toAddress: '',
        signature,
        isValid: false,
        error: 'Transaction not found on-chain',
      };
    }

    // Check if transaction was successful
    if (transaction.meta?.err) {
      return {
        amountSOL: 0,
        fromAddress: '',
        toAddress: '',
        signature,
        isValid: false,
        error: `Transaction failed: ${JSON.stringify(transaction.meta.err)}`,
      };
    }

    const message = transaction.transaction.message as any;
    let accountKeys: PublicKey[] = [];
    if (typeof message.getAccountKeys === "function") {
      const keys = message.getAccountKeys();
      accountKeys = [
        ...keys.staticAccountKeys,
        ...(keys.lookupTableAccounts?.flatMap((table: any) => table.addresses) ??
          []),
      ];
    } else if (Array.isArray(message.accountKeys)) {
      accountKeys = message.accountKeys.map((key: any) =>
        key instanceof PublicKey ? key : new PublicKey(key)
      );
    }

    let transferAmount = 0;
    let fromPubkey: PublicKey | null = null;
    let toPubkey: PublicKey | null = null;

    const accountChanges =
      transaction.meta?.postBalances?.map((balance, index) => ({
        index,
        pubkey: accountKeys[index],
        preBalance: transaction.meta?.preBalances?.[index] || 0,
        postBalance: balance,
        change: balance - (transaction.meta?.preBalances?.[index] || 0),
      })) || [];

    const sender = accountChanges.find(
      (acc) =>
        acc.change < 0 && acc.pubkey && acc.pubkey.toBase58() === expectedFromAddress
    );
    const receiver = accountChanges.find(
      (acc) =>
        acc.change > 0 && acc.pubkey && acc.pubkey.toBase58() === expectedToAddress
    );

    if (sender && receiver) {
      transferAmount = Math.abs(sender.change) / LAMPORTS_PER_SOL;
      fromPubkey = sender.pubkey;
      toPubkey = receiver.pubkey;
    } else {
      const treasuryPubkey = new PublicKey(expectedToAddress);
      const receiverChange = accountChanges.find(
        (acc) => acc.pubkey?.equals(treasuryPubkey) && acc.change > 0
      );
      if (receiverChange) {
        transferAmount = receiverChange.change / LAMPORTS_PER_SOL;
        toPubkey = treasuryPubkey;
        const senderChange = accountChanges.find((acc) => acc.change < 0);
        if (senderChange) {
          fromPubkey = senderChange.pubkey;
        }
      }
    }

    if (!fromPubkey || !toPubkey || transferAmount === 0) {
      return {
        amountSOL: 0,
        fromAddress: fromPubkey?.toBase58() || '',
        toAddress: toPubkey?.toBase58() || '',
        signature,
        isValid: false,
        error: 'Could not parse transfer details from transaction',
      };
    }

    // Verify sender matches expected user
    if (fromPubkey.toBase58() !== expectedFromAddress) {
      return {
        amountSOL: transferAmount,
        fromAddress: fromPubkey.toBase58(),
        toAddress: toPubkey.toBase58(),
        signature,
        isValid: false,
        error: `Sender mismatch: expected ${expectedFromAddress}, got ${fromPubkey.toBase58()}`,
      };
    }

    // Verify recipient matches treasury
    if (toPubkey.toBase58() !== expectedToAddress) {
      return {
        amountSOL: transferAmount,
        fromAddress: fromPubkey.toBase58(),
        toAddress: toPubkey.toBase58(),
        signature,
        isValid: false,
        error: `Recipient mismatch: expected ${expectedToAddress}, got ${toPubkey.toBase58()}`,
      };
    }

    // Verify amount if provided — compare in lamports to avoid float precision
    if (expectedAmount !== undefined) {
      const transferLamports = Math.round(transferAmount * LAMPORTS_PER_SOL);
      const expectedLamports = Math.round(expectedAmount * LAMPORTS_PER_SOL);
      const lamportTolerance = 10_000; // accept tiny overage; only reject if underpaid by > tolerance
      if (transferLamports + lamportTolerance < expectedLamports) {
        return {
          amountSOL: transferAmount,
          fromAddress: fromPubkey.toBase58(),
          toAddress: toPubkey.toBase58(),
          signature,
          isValid: false,
          error: `Amount mismatch: expected at least ${expectedAmount}, got ${transferAmount} (lamports expected>=${expectedLamports}, got=${transferLamports})`,
        };
      }
    }

    // All checks passed!
    return {
      amountSOL: transferAmount,
      fromAddress: fromPubkey.toBase58(),
      toAddress: toPubkey.toBase58(),
      signature,
      isValid: true,
    };
  } catch (error: any) {
    console.error('[VerifyDeposit] Error verifying transaction:', error);
    return {
      amountSOL: 0,
      fromAddress: '',
      toAddress: '',
      signature,
      isValid: false,
      error: error.message || 'Failed to verify transaction',
    };
  }
}

