import { db } from '../db';
import { usageTracking, broadcastSessions, users } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export class UsageTrackingService {
  /**
   * Obtém o uso atual do usuário no mês
   */
  async getCurrentUsage(userId: number): Promise<{
    totalMinutes: number;
    limitMinutes: number;
    remainingMinutes: number;
    percentageUsed: number;
    isLimitReached: boolean;
    plan: string;
  }> {
    try {
      // Buscar plano do usuário
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (!user || user.length === 0) {
        throw new Error('User not found');
      }

      const userPlan = user[0].plan || 'free';
      
      // Definir limites por plano
      const limits = {
        free: 300, // 5 horas = 300 minutos
        pro: 0,    // Ilimitado
        enterprise: 0 // Ilimitado
      };

      const limitMinutes = limits[userPlan as keyof typeof limits];

      // Mês atual (YYYY-MM)
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Buscar ou criar registro de uso do mês
      let usage = await db
        .select()
        .from(usageTracking)
        .where(and(
          eq(usageTracking.userId, userId),
          eq(usageTracking.month, currentMonth)
        ))
        .limit(1);

      if (!usage || usage.length === 0) {
        // Criar novo registro para o mês
        await db.insert(usageTracking).values({
          userId,
          month: currentMonth,
          totalMinutes: 0,
          limitMinutes,
        });

        usage = [{
          id: 0,
          userId,
          month: currentMonth,
          totalMinutes: 0,
          limitMinutes,
          lastUpdatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }];
      }

      const totalMinutes = usage[0].totalMinutes;
      const remainingMinutes = limitMinutes === 0 ? Infinity : Math.max(0, limitMinutes - totalMinutes);
      const percentageUsed = limitMinutes === 0 ? 0 : Math.min(100, (totalMinutes / limitMinutes) * 100);
      const isLimitReached = limitMinutes > 0 && totalMinutes >= limitMinutes;

      return {
        totalMinutes,
        limitMinutes,
        remainingMinutes: remainingMinutes === Infinity ? 0 : remainingMinutes,
        percentageUsed,
        isLimitReached,
        plan: userPlan,
      };
    } catch (error) {
      console.error('[UsageTracking] Error getting current usage:', error);
      throw error;
    }
  }

  /**
   * Inicia uma nova sessão de broadcast
   */
  async startBroadcastSession(userId: number, transmissionId?: number): Promise<number> {
    try {
      // Verificar se o usuário atingiu o limite
      const usage = await this.getCurrentUsage(userId);
      
      if (usage.isLimitReached) {
        throw new Error('LIMIT_REACHED: Monthly broadcast limit exceeded. Please upgrade your plan.');
      }

      // Criar nova sessão
      const result = await db.insert(broadcastSessions).values({
        userId,
        transmissionId,
        durationMinutes: 0,
        startedAt: new Date(),
      });

      console.log(`[UsageTracking] Broadcast session started for user ${userId}`);
      
      return result[0].insertId;
    } catch (error) {
      console.error('[UsageTracking] Error starting broadcast session:', error);
      throw error;
    }
  }

  /**
   * Finaliza uma sessão de broadcast e atualiza o uso
   */
  async endBroadcastSession(sessionId: number): Promise<void> {
    try {
      // Buscar sessão
      const session = await db
        .select()
        .from(broadcastSessions)
        .where(eq(broadcastSessions.id, sessionId))
        .limit(1);

      if (!session || session.length === 0) {
        throw new Error('Session not found');
      }

      const startedAt = session[0].startedAt;
      const endedAt = new Date();
      
      // Calcular duração em minutos
      const durationMs = endedAt.getTime() - startedAt.getTime();
      const durationMinutes = Math.ceil(durationMs / 60000); // Arredondar para cima

      // Atualizar sessão
      await db
        .update(broadcastSessions)
        .set({
          endedAt,
          durationMinutes,
        })
        .where(eq(broadcastSessions.id, sessionId));

      // Atualizar uso total do mês
      const currentMonth = new Date().toISOString().slice(0, 7);
      const userId = session[0].userId;

      await db
        .update(usageTracking)
        .set({
          totalMinutes: usageTracking.totalMinutes + durationMinutes,
        })
        .where(and(
          eq(usageTracking.userId, userId),
          eq(usageTracking.month, currentMonth)
        ));

      console.log(`[UsageTracking] Broadcast session ${sessionId} ended. Duration: ${durationMinutes} minutes`);
    } catch (error) {
      console.error('[UsageTracking] Error ending broadcast session:', error);
      throw error;
    }
  }

  /**
   * Obtém histórico de sessões do usuário
   */
  async getUserSessions(userId: number, limit: number = 10): Promise<any[]> {
    try {
      const sessions = await db
        .select()
        .from(broadcastSessions)
        .where(eq(broadcastSessions.userId, userId))
        .orderBy(broadcastSessions.startedAt)
        .limit(limit);

      return sessions;
    } catch (error) {
      console.error('[UsageTracking] Error getting user sessions:', error);
      throw error;
    }
  }
}
