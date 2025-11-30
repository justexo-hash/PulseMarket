import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

export function getWalletSignMessage(nonce: string) {
  return `PulseMarket wants you to sign in with your Solana wallet.\n\nNonce: ${nonce}\n\nOnly sign this message for a trusted site.`;
}

export function verifySolanaSignature(params: {
  walletAddress: string;
  nonce: string;
  signature: string;
}) {
  const { walletAddress, nonce, signature } = params;

  const message = getWalletSignMessage(nonce);
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = Buffer.from(signature, "base64");
  const publicKey = new PublicKey(walletAddress);

  return nacl.sign.detached.verify(
    messageBytes,
    signatureBytes,
    publicKey.toBytes()
  );
}


