import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

export class EmailService {
  private resend: Resend;

  constructor() {
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured. Email sending will be disabled.');
    }
    this.resend = new Resend(RESEND_API_KEY);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string, userName?: string): Promise<void> {
    if (!RESEND_API_KEY) {
      console.log('Email sending disabled. Reset link:', `${APP_URL}/reset-password?token=${token}`);
      return;
    }

    const resetLink = `${APP_URL}/reset-password?token=${token}`;
    const name = userName || email.split('@')[0];

    try {
      await this.resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Recuperação de Senha - OnnPlay Studio',
        html: this.getPasswordResetTemplate(name, resetLink),
      });

      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * HTML template for password reset email
   */
  private getPasswordResetTemplate(name: string, resetLink: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 48px; height: 48px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 24px;">📻</span>
                      </div>
                      <div>
                        <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">OnnPlay</h1>
                        <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 600;">STUDIO PRO</p>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #f1f5f9; font-size: 24px; font-weight: 600;">Recuperação de Senha</h2>
              
              <p style="margin: 0 0 24px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                Olá, <strong style="color: #f1f5f9;">${name}</strong>!
              </p>
              
              <p style="margin: 0 0 24px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta no <strong style="color: #f1f5f9;">OnnPlay Studio</strong>.
              </p>
              
              <p style="margin: 0 0 32px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                Clique no botão abaixo para criar uma nova senha:
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${resetLink}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(234, 88, 12, 0.3);">
                      Redefinir Senha
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Ou copie e cole este link no seu navegador:
              </p>
              
              <p style="margin: 0 0 32px; padding: 12px; background-color: #0f172a; border-radius: 6px; color: #64748b; font-size: 13px; word-break: break-all; font-family: 'Courier New', monospace;">
                ${resetLink}
              </p>
              
              <div style="padding: 16px; background-color: rgba(234, 88, 12, 0.1); border-left: 4px solid #ea580c; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                  <strong style="color: #f1f5f9;">⚠️ Importante:</strong> Este link expira em <strong style="color: #f1f5f9;">1 hora</strong>. Se você não solicitou a redefinição de senha, ignore este email.
                </p>
              </div>
              
              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Se você não solicitou esta alteração, sua conta permanece segura e você pode ignorar este email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #0f172a; border-top: 1px solid #334155;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-align: center;">
                © ${new Date().getFullYear()} OnnPlay Studio. Todos os direitos reservados.
              </p>
              <p style="margin: 0; color: #475569; font-size: 12px; text-align: center;">
                Transmissão profissional para criadores de conteúdo
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Send welcome email (optional - for future use)
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<void> {
    if (!RESEND_API_KEY) {
      console.log('Email sending disabled. Welcome email would be sent to:', email);
      return;
    }

    try {
      await this.resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Bem-vindo ao OnnPlay Studio! 🎉',
        html: this.getWelcomeTemplate(userName),
      });

      console.log(`Welcome email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw error for welcome email - it's not critical
    }
  }

  /**
   * HTML template for welcome email
   */
  private getWelcomeTemplate(name: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao OnnPlay Studio</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; text-align: center;">🎉 Bem-vindo ao OnnPlay Studio!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                Olá, <strong style="color: #f1f5f9;">${name}</strong>!
              </p>
              
              <p style="margin: 0 0 24px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                Sua conta foi criada com sucesso! Você agora tem acesso à plataforma profissional de transmissão ao vivo.
              </p>
              
              <h3 style="margin: 0 0 16px; color: #f1f5f9; font-size: 18px; font-weight: 600;">O que você pode fazer:</h3>
              
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #cbd5e1; font-size: 15px; line-height: 1.8;">
                <li>📡 Transmitir para múltiplas plataformas simultaneamente</li>
                <li>🎥 Realizar videochamadas profissionais integradas</li>
                <li>🎛️ Controlar áudio com mixer avançado</li>
                <li>📊 Acompanhar analytics em tempo real</li>
              </ul>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0 32px;">
                    <a href="${APP_URL}/studio" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(234, 88, 12, 0.3);">
                      Acessar Estúdio
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Precisa de ajuda? Entre em contato conosco em <a href="mailto:info@onnplay.com" style="color: #f97316; text-decoration: none;">info@onnplay.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #0f172a; border-top: 1px solid #334155;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-align: center;">
                © ${new Date().getFullYear()} OnnPlay Studio. Todos os direitos reservados.
              </p>
              <p style="margin: 0; color: #475569; font-size: 12px; text-align: center;">
                Transmissão profissional para criadores de conteúdo
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
