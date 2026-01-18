/**
 * Welcome email template sent after successful purchase
 * Contains magic link for immediate course access
 */
export const welcomeEmail = (magicLink: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Willkommen zum AI-Kurs</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Willkommen zum AI-Kurs!</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 40px 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Vielen Dank für deine Anmeldung! Dein Zugang zum AI-Kurs ist jetzt aktiv.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 30px;">
      Klicke auf den Button unten, um sofort mit dem Lernen zu beginnen:
    </p>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${magicLink}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        Kurs jetzt starten →
      </a>
    </div>
    
    <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #666;">
        <strong>💡 Tipp:</strong> Speichere diesen Link als Lesezeichen, um jederzeit auf den Kurs zugreifen zu können.
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Der Zugangslink ist gültig für 7 Tage. Nach der ersten Anmeldung bleibt dein Zugang dauerhaft aktiv.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 14px; color: #666; margin: 0;">
      Bei Fragen kannst du jederzeit antworten oder uns kontaktieren.
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 20px;">
      Viel Erfolg beim Lernen!<br>
      Dein AI-Kurs Team
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
    <p>© ${new Date().getFullYear()} AI-Kurs. Alle Rechte vorbehalten.</p>
  </div>
</body>
</html>
`;

export const welcomeEmailSubject =
  "🎉 Willkommen zum AI-Kurs - Dein Zugang ist aktiv!";
