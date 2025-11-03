import { storage } from "./storage";
import { realtimeService } from "./websocket";
import { log } from "./vite";
import { getTreasuryKeypair, distributePayouts } from "./payouts";
import { generateCommitmentHash, generateSecret, verifyCommitmentHash } from "./provablyFair";

/**
 * Background job to check for and auto-resolve expired markets
 * Runs every minute to check for markets that have expired
 */
export function startExpiredMarketsJob() {
  const CHECK_INTERVAL = 60 * 1000; // Check every minute

  async function checkExpiredMarkets() {
    try {
      const allMarkets = await storage.getAllMarkets();
      const now = new Date();

      for (const market of allMarkets) {
        // Only check active markets with expiration dates
        if (market.status !== "active" || !market.expiresAt) {
          continue;
        }

        const expirationDate = new Date(market.expiresAt);
        
        // If market has expired
        if (expirationDate <= now) {
          log(`Auto-resolving expired market ${market.id}: ${market.question}`);
          
          // Auto-resolve based on current probability (if > 50%, resolve to "yes")
          const defaultOutcome = market.probability > 50 ? "yes" : "no";
          
          try {
            // Get all bets for this market to calculate payouts
            const allBets = await storage.getBetsByMarket(market.id);
            const yesPool = parseFloat(market.yesPool || "0");
            const noPool = parseFloat(market.noPool || "0");
            const totalPool = yesPool + noPool;

            let onChainPayoutResults: Array<{ walletAddress: string; amountSOL: number; txSignature: string | null; error?: string }> = [];

            // Only proceed if there are bets
            if (totalPool > 0 && allBets.length > 0) {
              try {
                const treasuryKeypair = getTreasuryKeypair();
                if (treasuryKeypair) {
                  const winnerBets = allBets.filter(bet => bet.position === defaultOutcome);
                  const totalWinnerBets = winnerBets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);

                  if (totalWinnerBets > 0 && winnerBets.length > 0) {
                    // Calculate payouts for each winner
                    const payouts: Array<{ walletAddress: string; amountSOL: number }> = [];
                    
                    // Check if this is a winner-takes-all private wager
                    const isWinnerTakesAll = market.payoutType === "winner-takes-all" && market.isPrivate === 1;
                    
                    for (const bet of winnerBets) {
                      const user = await storage.getUserById(bet.userId);
                      if (!user) continue;
                      
                      let payoutAmount: number;
                      if (isWinnerTakesAll) {
                        // Winner-takes-all: split pool equally among all winners
                        payoutAmount = totalPool / winnerBets.length;
                      } else {
                        // Proportional: based on bet size
                        const betAmount = parseFloat(bet.amount);
                        payoutAmount = (betAmount / totalWinnerBets) * totalPool;
                      }
                      
                      payouts.push({
                        walletAddress: user.walletAddress,
                        amountSOL: payoutAmount,
                      });
                    }

                    if (payouts.length > 0) {
                      log(`[Expired] Distributing ${payouts.length} payouts totaling ${totalPool} SOL`);
                      onChainPayoutResults = await distributePayouts(treasuryKeypair, payouts);
                      
                      const successful = onChainPayoutResults.filter(r => r.txSignature).length;
                      const failed = onChainPayoutResults.filter(r => !r.txSignature).length;
                      log(`[Expired] Payouts: ${successful} successful, ${failed} failed`);
                    }
                  }
                } else {
                  log(`[Expired] Treasury keypair not available. Database payouts only.`);
                }
              } catch (payoutError: any) {
                log(`Error distributing payouts for market ${market.id}: ${payoutError.message}`);
                // Continue with resolution even if payouts fail
              }

              // Update database with payouts (including on-chain transaction signatures)
              const onChainPayouts = onChainPayoutResults
                .filter(r => r.txSignature)
                .map(r => ({
                  walletAddress: r.walletAddress,
                  amountSOL: r.amountSOL,
                  txSignature: r.txSignature!,
                }));

              await storage.calculateAndDistributePayouts(
                market.id,
                defaultOutcome,
                onChainPayouts
              );
            }

            // Generate provably fair commitment
            const secret = generateSecret();
            const commitmentHash = generateCommitmentHash(defaultOutcome, secret, market.id);
            
            // Verify the commitment is valid
            const isValid = verifyCommitmentHash(commitmentHash, defaultOutcome, secret, market.id);
            if (!isValid) {
              log(`[Expired] Generated invalid commitment hash for market ${market.id}! This should never happen.`);
            }

            // Resolve the market with provably fair data
            const resolvedMarket = await storage.resolveMarket(market.id, defaultOutcome, commitmentHash, secret);
            
            if (resolvedMarket) {
              log(`Successfully auto-resolved market ${market.id} to ${defaultOutcome}`);
              log(`[Expired] Provably fair commitment: ${commitmentHash}`);
              
              // Broadcast market resolution
              realtimeService.broadcast({ 
                type: 'market:resolved', 
                data: { id: market.id } 
              });
              realtimeService.broadcast({ 
                type: 'market:updated', 
                data: { id: market.id } 
              });
            }
          } catch (error: any) {
            log(`Error auto-resolving market ${market.id}: ${error.message}`);
            console.error(error);
          }
        }
      }
    } catch (error: any) {
      log(`Error checking expired markets: ${error.message}`);
      console.error(error);
    }
  }

  // Run immediately on startup, then every minute
  checkExpiredMarkets();
  setInterval(checkExpiredMarkets, CHECK_INTERVAL);

  log("Expired markets checker started (checking every minute)");
}

