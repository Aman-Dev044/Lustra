/** Rule-based reply suggestions for reviews and inbound messages. Deterministic and explainable. */

export type Intent = 'pricing' | 'availability' | 'status' | 'thanks' | 'complaint' | 'reschedule' | 'general';

const INTENT_PATTERNS: [Intent, RegExp][] = [
  ['complaint', /\b(disappoint|unhappy|not happy|upset|damage|damaged|scratch(ed)?|swirl|streak|refund|issue|problem|terrible|worst|bad job|missed a spot)/i],
  ['reschedule', /\b(reschedul|move (my|the) (appointment|booking)|change (the )?(time|date)|cancel|running late|can'?t make it|push (it )?back)/i],
  ['pricing', /(\$|\bprice|\bpricing|\bcost|how much|\bquote|\bestimate|\bdiscount|\bdeal)/i],
  ['status', /\b(ready|done yet|finished|status|how long|eta|update|pick ?up|when will)/i],
  ['availability', /\b(available|availability|opening|openings|book|appointment|saturday|sunday|today|tomorrow|this week|next week|when can|any time)/i],
  ['thanks', /\b(thank|thanks|thx|awesome|amazing|love it|loved|great job|looks (great|amazing|incredible)|perfect)/i],
];

export function detectIntent(text: string): Intent {
  for (const [intent, rx] of INTENT_PATTERNS) if (rx.test(text)) return intent;
  return 'general';
}

export function messageSuggestions(input: {
  message: string;
  firstName: string;
  shopName: string;
  bookingLink: string;
  portalLink?: string;
  nextAppointment?: string;
  jobStage?: string;
}): { intent: Intent; suggestions: string[] } {
  const { firstName: name, shopName, bookingLink, portalLink, nextAppointment, jobStage } = input;
  const intent = detectIntent(input.message);
  const track = portalLink ? ` You can follow along live here: ${portalLink}` : '';
  const map: Record<Intent, string[]> = {
    pricing: [
      `Hi ${name}! Happy to help with pricing — it depends on your vehicle size and paint condition. Could you send a couple of photos so we can give you an exact quote?`,
      `Great question ${name}! I can put together a detailed quote with options for you today. What year/make/model is the vehicle?`,
      `Hi ${name}, you can see our packages and book instantly here: ${bookingLink} — reply if you'd like a custom quote instead.`,
    ],
    availability: [
      `Hi ${name}! We have openings this week — you can grab any open slot instantly here: ${bookingLink}`,
      `Thanks for reaching out ${name}! What day works best for you? I'll hold a spot for you.`,
      `Hi ${name}, our next openings fill fast — want me to reserve the earliest available time and send you a confirmation?`,
    ],
    status: [
      jobStage === 'completed'
        ? `Hi ${name}! Your vehicle is all done and ready for pickup ✨${track}`
        : `Hi ${name}! We're working on it now and will text you the moment it's ready.${track}`,
      `Hi ${name}, quick update: everything is on schedule. I'll send photos when we wrap up!`,
      `Thanks for checking in ${name}! Our team is finishing up — expect a text from us within the hour.`,
    ],
    thanks: [
      `Thank you so much ${name}! It was a pleasure working on your vehicle. 🙌`,
      `We really appreciate you ${name}! If you have a moment, a quick review would mean the world to our small team at ${shopName}.`,
      `So glad you love it ${name}! Remember to book a maintenance wash in a few weeks to keep it looking this good: ${bookingLink}`,
    ],
    complaint: [
      `Hi ${name}, I'm really sorry to hear that — this isn't the experience we want for you. Could you send a photo? We'll make it right as a priority.`,
      `${name}, thank you for letting us know. I'd like to personally take a look — can you bring it by this week at no charge?`,
      `I apologize ${name}. I'm the right person to fix this — when is a good time for a quick call today?`,
    ],
    reschedule: [
      `No problem at all ${name}! You can pick a new time that works for you here: ${bookingLink}`,
      `Thanks for the heads up ${name}. ${nextAppointment ? `Your current appointment is ${nextAppointment}. ` : ''}What day/time would work better?`,
      `All good ${name} — I've noted it. Reply with a couple of times that work and I'll confirm one right away.`,
    ],
    general: [
      `Hi ${name}! Thanks for your message — how can we help today?`,
      `Hi ${name}, thanks for reaching out to ${shopName}! I'll get back to you shortly with details.`,
      `Hey ${name}! Got it — let me check and follow up in a few minutes.`,
    ],
  };
  return { intent, suggestions: map[intent] };
}

const TOPICS: [RegExp, string][] = [
  [/ceramic|coating/i, 'ceramic coating'],
  [/ppf|paint protection|clear bra|film/i, 'paint protection film'],
  [/tint/i, 'window tint'],
  [/wrap/i, 'wrap'],
  [/interior|seat|carpet|pet hair/i, 'interior'],
  [/correction|polish|swirl/i, 'paint correction'],
  [/detail/i, 'detail'],
];

export function reviewReplySuggestions(input: { rating: number; comment: string; firstName: string; shopName: string }): string[] {
  const { rating, comment, shopName } = input;
  const name = input.firstName || 'there';
  const topic = TOPICS.find(([rx]) => rx.test(comment))?.[1];
  const about = topic ? ` your ${topic}` : '';
  const slow = /wait|late|slow|took (too )?long|delay/i.test(comment);
  const price = /price|expensive|cost|pricey/i.test(comment);
  const staff = /friendly|professional|helpful|team|staff|communicat/i.test(comment);

  if (rating >= 4) {
    return [
      `Thank you so much, ${name}! We loved working on${about || ' your vehicle'} and we're thrilled with how it turned out. See you at your next visit! — The ${shopName} team`,
      `${name}, this made our day! ${staff ? 'We will pass your kind words on to the team. ' : ''}Thanks for trusting ${shopName}${about ? ` with${about}` : ''}.`,
      `Thanks for the ${rating}-star review, ${name}! Enjoy the shine — and don't hesitate to reach out if you ever need anything.`,
    ];
  }
  if (rating === 3) {
    return [
      `Thanks for the honest feedback, ${name}. We're glad parts of${about || ' your visit'} went well, and we'd love to hear how we can earn 5 stars next time.`,
      `${name}, we appreciate you taking the time to share this. ${slow ? 'You are right that we ran behind — we are adjusting our scheduling so it does not happen again. ' : ''}Please reach out directly so we can make it right.`,
      `Thank you ${name}. Every review helps ${shopName} improve — we'd welcome the chance to show you our best work.`,
    ];
  }
  return [
    `${name}, we're truly sorry your experience${about ? ` with${about}` : ''} fell short. ${slow ? 'The delay is on us. ' : ''}${price ? 'We want you to feel you received full value. ' : ''}Please contact us directly so we can make this right.`,
    `Hi ${name}, thank you for letting us know. This isn't the standard we hold ourselves to at ${shopName}. Our manager will reach out personally to resolve it.`,
    `We apologize, ${name}. We'd like the opportunity to fix this at no cost — please reply or call us at your convenience.`,
  ];
}
