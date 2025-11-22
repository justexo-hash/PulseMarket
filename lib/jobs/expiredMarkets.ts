import { storage } from "@server/storage";
import { publishEvent, publishToUser } from "@lib/realtime/server";
import {
  getTreasuryKeypair,
  distributePayouts,
} from "@server/payouts";
import {
  generateCommitmentHash,
  generateSecret,
  verifyCommitmentHash,
} from "@server/provablyFair";

export async function runExpiredMarketsJob() {
  const allMarkets = await storage.getAllMarkets();
  const now = new Date();

  for (const market of allMarkets) {
    if (market.status !== "active" || !market.expiresAt) {
      continue;
    }

    const expirationDate = new Date(market.expiresAt);
    if (expirationDate > now) continue;

    const defaultOutcome = market.probability > 50 ? "yes" : "no";

    try {
      const allBets = await storage.getBetsByMarket(market.id);
      const yesPool = parseFloat(market.yesPool || "0");
      const noPool = parseFloat(market.noPool || "0");
      const totalPool = yesPool + noPool;

      let onChainPayoutResults: Array<{
        walletAddress: string;
        amountSOL: number;
        txSignature: string | null;
        error?: string;
      }> = [];

      if (totalPool > 0 && allBets.length > 0) {
        try {
          const treasuryKeypair = getTreasuryKeypair();
          if (treasuryKeypair) {
            const winnerBets = allBets.filter(
              (bet) => bet.position === defaultOutcome
            );
            const totalWinnerBets = winnerBets.reduce(
              (sum, bet) => sum + parseFloat(bet.amount),
              0
            );

            if (totalWinnerBets > 0 && winnerBets.length > 0) {
              const payouts: Array<{ walletAddress: string; amountSOL: number }> =
                [];

              const isWinnerTakesAll =
                market.payoutType === "winner-takes-all" && market.isPrivate === 1;

              for (const bet of winnerBets) {
                const user = await storage.getUserById(bet.userId);
                if (!user) continue;

                let payoutAmount: number;
                if (isWinnerTakesAll) {
                  payoutAmount = totalPool / winnerBets.length;
                } else {
                  const betAmount = parseFloat(bet.amount);
                  payoutAmount = (betAmount / totalWinnerBets) * totalPool;
                }

                payouts.push({
                  walletAddress: user.walletAddress,
                  amountSOL: payoutAmount,
                });
              }

              if (payouts.length > 0) {
                onChainPayoutResults = await distributePayouts(
                  treasuryKeypair,
                  payouts
                );
              }
            }
          }
        } catch (payoutError: any) {
          console.error(
            `[Expired] Error distributing payouts for market ${market.id}:`,
            payoutError
          );
        }

        const onChainPayouts = onChainPayoutResults
          .filter((r) => r.txSignature)
          .map((r) => ({
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

      const secret = generateSecret();
      const commitmentHash = generateCommitmentHash(
        defaultOutcome,
        secret,
        market.id
      );

      const isValid = verifyCommitmentHash(
        commitmentHash,
        defaultOutcome,
        secret,
        market.id
      );

      if (!isValid) {
        console.error(
          `[Expired] Generated invalid commitment hash for market ${market.id}`
        );
      }

      const resolvedMarket = await storage.resolveMarket(
        market.id,
        defaultOutcome,
        commitmentHash,
        secret
      );

      if (resolvedMarket) {
        await publishEvent({ type: "market:resolved", data: { id: market.id } });
        await publishEvent({ type: "market:updated", data: { id: market.id } });

        const winnerBets = allBets.filter(
          (bet) => bet.position === defaultOutcome
        );
        const winnerUserIds = winnerBets
          .map((bet) => bet.userId)
          .filter((id, index, arr): id is number => id !== undefined && arr.indexOf(id) === index);
        await Promise.all(
          winnerUserIds.map((id) =>
            publishToUser(id, { type: "balance:updated", data: { userId: id } })
          )
        );
      }
    } catch (error: any) {
      console.error(`[Expired] Error auto-resolving market ${market.id}:`, error);
    }
  }
}

