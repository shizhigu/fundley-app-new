# CEO Feedback System Setup

## 🎯 Features

- **Floating Button**: Always accessible in bottom-right corner
- **Quick Categories**: Bug, Suggestion, Complaint, Praise, Question
- **One-Click Screenshot**: Capture current page automatically
- **Anonymous or Authenticated**: Works for all users
- **Real-time Notifications**: Instant Discord/Email alerts

## 📋 Setup Instructions

### Option 1: Discord Webhook (Recommended - FREE & INSTANT)

1. **Create Discord Server** (if you don't have one)
   - Create a new Discord server or use existing
   - Create a dedicated channel like `#ceo-feedback`

2. **Create Webhook**
   - Go to channel settings → Integrations → Webhooks
   - Click "New Webhook"
   - Name it "Fundley CEO Feedback"
   - Copy the webhook URL

3. **Add to .env.local**
   ```bash
   DISCORD_CEO_FEEDBACK_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
   ```

4. **Done!** Feedback will appear instantly in Discord with:
   - Colored embeds based on feedback type
   - User info, contact details
   - Page URL and timestamp
   - Screenshot attachments

### Option 2: Email Notifications

1. **Add to .env.local**
   ```bash
   CEO_EMAIL=your-email@example.com
   # or
   ADMIN_EMAIL=your-email@example.com
   ```

2. **Install email service** (choose one):
   ```bash
   # Resend (recommended)
   pnpm add resend

   # Or SendGrid
   pnpm add @sendgrid/mail

   # Or AWS SES
   pnpm add @aws-sdk/client-ses
   ```

3. **Uncomment email code** in `/app/api/ceo-feedback/route.ts`

### Option 3: Both (Recommended)

Set up both Discord (for instant mobile notifications) and Email (for formal record).

## 🎨 UI Components

### Floating Button
- **Position**: Fixed bottom-right (right-6 bottom-6)
- **Style**: Orange gradient with pulse animation
- **Icon**: Message bubble
- **Z-index**: 50 (above most content, below modals)

### Feedback Panel
- **Size**: 384px width, max 600px height
- **Sections**:
  - 5 feedback type buttons (emoji + label)
  - Textarea (1000 char limit)
  - Screenshot capture button
  - Optional contact input
  - Submit button

### Notifications
- **Discord**: Rich embeds with color coding
- **Email**: Plain text with context
- **Console**: Fallback logging

## 🔧 Customization

### Change Button Position
Edit `ceo-feedback-button.tsx`:
```tsx
// Current: bottom-6 right-6
// Move to left: bottom-6 left-6
// Move higher: bottom-20 right-6
```

### Add More Feedback Types
Edit `feedbackTypes` array in `ceo-feedback-button.tsx`:
```tsx
{ id: 'urgent', label: '紧急', emoji: '🚨', color: 'bg-red-600/10 text-red-700' }
```

### Customize Discord Embeds
Edit Discord payload in `/app/api/ceo-feedback/route.ts`

### Change Screenshot Quality
Edit `html2canvas` options:
```tsx
scale: 0.5,  // Lower = smaller file size
quality: 0.7, // JPEG quality (0-1)
```

## 🛠 Troubleshooting

### Button Not Showing
- Check if `CEOFeedbackButton` is imported in layout.tsx
- Verify z-index conflicts with other fixed elements
- Check browser console for errors

### Screenshots Not Working
- Ensure `html2canvas` is installed: `pnpm add html2canvas`
- Check CORS issues for cross-origin images
- Try reducing scale if timeout occurs

### Feedback Not Received
1. **Discord**: Test webhook URL in Postman/curl
2. **Email**: Check SMTP credentials and spam folder
3. **Console**: Check server logs for errors

## 📱 Mobile Optimization

The component is fully responsive:
- Button scales properly on mobile
- Panel adjusts width on small screens
- Screenshot capture works on mobile browsers

## 🎯 Usage Analytics

To track usage, add analytics events:
```tsx
// In handleSubmit()
analytics.track('CEO_Feedback_Sent', {
  type: selectedType,
  hasScreenshot: !!screenshot,
  hasContact: !!contact,
});
```

## 🔐 Security Notes

- Anonymous feedback allowed (no auth required)
- Screenshots are base64-encoded (not stored permanently)
- User emails only collected if logged in
- No sensitive data logged to console in production

## 🚀 Future Enhancements

- [ ] Feedback history for logged-in users
- [ ] In-app notification when CEO responds
- [ ] Sentiment analysis for auto-prioritization
- [ ] Integration with Linear/Jira for bug tracking
- [ ] Video recording option
- [ ] Multiple file attachments
