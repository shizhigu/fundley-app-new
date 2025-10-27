import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FeedbackData {
  type: 'bug' | 'suggestion' | 'complaint' | 'praise' | 'question';
  message: string;
  contact?: string;
  screenshot?: string;
  userAgent: string;
  currentUrl: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const data: FeedbackData = await request.json();

    // Get user info
    const userEmail = sessionClaims?.email as string | undefined;
    const userName = sessionClaims?.name as string | undefined;

    // Prepare feedback message
    const feedbackEmoji: Record<FeedbackData['type'], string> = {
      bug: '🐛',
      suggestion: '💡',
      complaint: '😡',
      praise: '❤️',
      question: '❓',
    };

    const emoji = feedbackEmoji[data.type];
    const typeLabel = {
      bug: 'Bug Report',
      suggestion: 'Feature Suggestion',
      complaint: 'User Complaint',
      praise: 'User Praise',
      question: 'User Question',
    }[data.type];

    // Format message for notification
    const notificationText = `
${emoji} **${typeLabel}**

**From:** ${userName || 'Anonymous'} ${userEmail ? `(${userEmail})` : ''}
**User ID:** ${userId || 'Not logged in'}
**Contact:** ${data.contact || 'Not provided'}

**Message:**
${data.message}

**Context:**
- URL: ${data.currentUrl}
- Browser: ${data.userAgent}
- Time: ${data.timestamp}

${data.screenshot ? '📸 Screenshot attached' : ''}
    `.trim();

    // Send to Discord webhook (recommended - instant, free, organized)
    const discordWebhookUrl = process.env.DISCORD_CEO_FEEDBACK_WEBHOOK;
    if (discordWebhookUrl) {
      const discordPayload: any = {
        embeds: [
          {
            title: `${emoji} ${typeLabel}`,
            description: data.message,
            color: {
              bug: 0xef4444, // red
              suggestion: 0xeab308, // yellow
              complaint: 0xf97316, // orange
              praise: 0x22c55e, // green
              question: 0x3b82f6, // blue
            }[data.type],
            fields: [
              {
                name: '👤 User',
                value: `${userName || 'Anonymous'}\n${userEmail || 'No email'}`,
                inline: true,
              },
              {
                name: '📧 Contact',
                value: data.contact || 'Not provided',
                inline: true,
              },
              {
                name: '🔗 Page',
                value: `[${data.currentUrl}](${data.currentUrl})`,
                inline: false,
              },
              {
                name: '🕐 Timestamp',
                value: new Date(data.timestamp).toLocaleString(),
                inline: true,
              },
            ],
            footer: {
              text: `User ID: ${userId || 'Anonymous'}`,
            },
            timestamp: data.timestamp,
          },
        ],
      };

      // Add screenshot as image if provided
      if (data.screenshot) {
        discordPayload.embeds[0].image = {
          url: 'attachment://screenshot.jpg',
        };

        // Send with file attachment
        const formData = new FormData();
        formData.append('payload_json', JSON.stringify(discordPayload));

        // Convert base64 to blob
        const base64Data = data.screenshot.split(',')[1];
        const blob = Buffer.from(base64Data, 'base64');
        formData.append('files[0]', new Blob([blob], { type: 'image/jpeg' }), 'screenshot.jpg');

        await fetch(discordWebhookUrl, {
          method: 'POST',
          body: formData,
        });
      } else {
        // Send without attachment
        await fetch(discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordPayload),
        });
      }
    }

    // Fallback: Send to email (if Discord not configured)
    const adminEmail = process.env.CEO_EMAIL || process.env.ADMIN_EMAIL;
    if (adminEmail && !discordWebhookUrl) {
      // You can implement email sending here using services like:
      // - Resend (recommended)
      // - SendGrid
      // - AWS SES
      // - Postmark

      // Example with Resend (if installed):
      // const resend = new Resend(process.env.RESEND_API_KEY);
      // await resend.emails.send({
      //   from: 'feedback@fundley.com',
      //   to: adminEmail,
      //   subject: `${emoji} ${typeLabel} - Fundley Feedback`,
      //   text: notificationText,
      //   attachments: data.screenshot ? [{
      //     filename: 'screenshot.jpg',
      //     content: data.screenshot.split(',')[1]
      //   }] : undefined
      // });
    }

    // Log to console as fallback
    console.log('=== CEO FEEDBACK RECEIVED ===');
    console.log(notificationText);
    if (data.screenshot) {
      console.log(`Screenshot size: ${(data.screenshot.length / 1024).toFixed(2)} KB`);
    }
    console.log('============================');

    return NextResponse.json({
      success: true,
      message: 'Feedback sent successfully',
    });
  } catch (error) {
    console.error('CEO Feedback API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send feedback' },
      { status: 500 }
    );
  }
}
