const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
    }
  });
}, { threshold: 0.18 });

document.querySelectorAll('.reveal-section').forEach((section) => {
  revealObserver.observe(section);
});

// Sticky service gallery: as the section scrolls, the focused card rises into place.
document.querySelectorAll('[data-service-stack]').forEach((stack) => {
  const section = stack.closest('.services');
  const cards = [...stack.querySelectorAll('.service-card')];
  if (!section || !cards.length) return;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const smoothstep = (value) => {
    const x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  };
  let ticking = false;

  const updateStack = () => {
    const rect = section.getBoundingClientRect();
    const stickyTop = window.matchMedia('(max-width: 900px)').matches ? 92 : 128;
    const scrollable = Math.max(1, rect.height - window.innerHeight - stickyTop);
    const raw = clamp((stickyTop - rect.top) / scrollable, 0, 1);
    const position = raw * (cards.length - 1);

    cards.forEach((card, index) => {
      const distance = index - position;
      const incoming = smoothstep(1 - clamp(distance, 0, 1));
      const passed = smoothstep(clamp(-distance, 0, 1));
      const future = clamp(distance, 0, cards.length);
      const y = future * 44 - passed * 96;
      const scale = 1 - future * 0.035 - passed * 0.025;
      const opacity = distance < -0.98 ? 0 : 1 - clamp(distance - 1.4, 0, 1) * 0.42;
      const rotate = future * -0.8 + passed * 0.9;

      card.style.transform = `translate3d(0, ${y}px, 0) scale(${scale}) rotate(${rotate}deg)`;
      card.style.opacity = opacity.toFixed(2);
      card.style.zIndex = String(100 - Math.round(Math.abs(distance) * 30) + (cards.length - index));
      card.style.filter = Math.abs(distance) < 0.55 ? 'brightness(1.04)' : 'brightness(.92)';
      card.setAttribute('aria-hidden', Math.abs(distance) > 1.15 ? 'true' : 'false');
    });

    ticking = false;
  };

  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateStack);
    }
  };

  updateStack();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
});

// Duplicate review cards so the desktop marquee loops without an empty gap.
document.querySelectorAll('.review-track').forEach((track) => {
  const cards = [...track.children];
  cards.forEach((card) => track.appendChild(card.cloneNode(true)));
});

// On mobile, rotate Google reviews one at a time instead of using the desktop marquee.
document.querySelectorAll('.review-window').forEach((windowEl) => {
  const track = windowEl.querySelector('.review-track');
  if (!track) return;
  let reviewIndex = 0;

  window.setInterval(() => {
    if (!window.matchMedia('(max-width: 900px)').matches) return;
    const cards = [...track.querySelectorAll('.review-card')];
    if (!cards.length) return;
    reviewIndex = (reviewIndex + 1) % Math.min(4, cards.length);
    windowEl.scrollTo({
      left: cards[reviewIndex].offsetLeft - 18,
      behavior: 'smooth'
    });
  }, 3400);
});

document.querySelectorAll('[data-slider]').forEach((slider) => {
  const after = slider.querySelector('[data-after]');
  const handle = slider.querySelector('.slider-handle');
  let isDragging = false;

  const setPosition = (clientX) => {
    const rect = slider.getBoundingClientRect();
    const raw = ((clientX - rect.left) / rect.width) * 100;
    const value = Math.max(6, Math.min(94, raw));
    after.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
    handle.style.left = `${value}%`;
  };

  slider.addEventListener('pointerdown', (event) => {
    isDragging = true;
    slider.setPointerCapture(event.pointerId);
    setPosition(event.clientX);
  });

  slider.addEventListener('pointermove', (event) => {
    if (isDragging || event.pointerType === 'mouse') {
      setPosition(event.clientX);
    }
  });

  slider.addEventListener('pointerup', () => {
    isDragging = false;
  });
});

const modal = document.querySelector('.quote-modal');
const modalClose = document.querySelector('.modal-close');

document.querySelectorAll('.quote-trigger').forEach((button) => {
  button.addEventListener('click', () => {
    if (modal?.showModal) {
      modal.showModal();
    }
  });
});

modalClose?.addEventListener('click', () => modal.close());

const assistant = document.querySelector('.lead-assistant');
const assistantLauncher = document.querySelector('.assistant-launcher');
const assistantMobileTrigger = document.querySelector('.assistant-mobile-trigger');
const assistantClose = document.querySelector('.assistant-close');
const assistantMessages = document.querySelector('.assistant-messages');
const assistantOptions = document.querySelector('.assistant-options');
const assistantForm = document.querySelector('.assistant-form');
const assistantInput = assistantForm?.querySelector('input');
const assistantNudgeTrigger = document.querySelector('.before-after');

const ownerName = 'James';
const ownerEmail = 'hello@verdantworks.com';
const ownerWhatsApp = '13055550147';
const assistantLead = {};
let assistantStep = 0;
let selectedServices = [];
let assistantHasNudged = false;

const assistantSteps = [
  {
    key: 'services',
    message: 'Hi, I am the garden assistant. I will ask a few quick questions so we can understand what you need and recommend the best next step. You can choose more than one service.',
    multi: true,
    options: ['Garden design', 'Lawn renovation', 'Hedge & tree care', 'Irrigation', 'Cleanup', 'Regular maintenance']
  },
  {
    key: 'jobType',
    message: 'Is this a one-off job or recurring care?',
    options: ['One-off project', 'Weekly care', 'Fortnightly care', 'Monthly care', 'Not sure yet']
  },
  {
    key: 'urgency',
    message: 'How soon do you need help?',
    options: ['ASAP', 'This week', 'This month', 'Flexible timing']
  },
  {
    key: 'size',
    message: 'Roughly how big is the area?',
    options: ['Small courtyard', 'Front yard', 'Backyard', 'Full property', 'Commercial site']
  },
  {
    key: 'suburb',
    message: 'What suburb is the job in?'
  },
  {
    key: 'details',
    message: 'Briefly describe what is happening. For example: overgrown lawn, messy beds, dead plants, poor drainage, broken irrigation, or a full redesign.'
  },
  {
    key: 'name',
    message: 'What is your name?'
  },
  {
    key: 'phone',
    message: 'What phone number should the team call or text?'
  },
  {
    key: 'email',
    message: 'What email should we use as backup?'
  }
];

const serviceKeywords = {
  'Garden design': ['design', 'layout', 'new garden', 'redesign', 'planting'],
  'Lawn renovation': ['lawn', 'grass', 'turf', 'patchy', 'mowing'],
  'Hedge & tree care': ['hedge', 'tree', 'prune', 'trim', 'branches'],
  Irrigation: ['irrigation', 'sprinkler', 'watering', 'dry', 'water'],
  Cleanup: ['cleanup', 'overgrown', 'messy', 'weeds', 'green waste'],
  'Regular maintenance': ['weekly', 'fortnightly', 'monthly', 'maintenance', 'regular']
};

const addAssistantMessage = (text, type = 'bot') => {
  if (!assistantMessages) return;
  const bubble = document.createElement('div');
  bubble.className = `assistant-message ${type}`.trim();
  bubble.innerHTML = text;
  assistantMessages.appendChild(bubble);
  assistantMessages.scrollTop = assistantMessages.scrollHeight;
};

const detectService = (value) => {
  const lower = value.toLowerCase();
  const match = Object.entries(serviceKeywords).find(([, keywords]) => {
    return keywords.some((keyword) => lower.includes(keyword));
  });
  return match ? match[0] : value;
};

const estimateLeadValue = () => {
  const highValueServices = ['Garden design', 'Lawn renovation', 'Irrigation'];
  if (assistantLead.urgency === 'ASAP') return 'High - call as soon as possible';
  if ((assistantLead.services || []).some((service) => highValueServices.includes(service))) return 'High - quote opportunity';
  if (String(assistantLead.jobType || '').includes('care')) return 'Medium - recurring care opportunity';
  return 'Medium - needs follow-up';
};

const renderAssistantOptions = (step = {}) => {
  if (!assistantOptions) return;
  assistantOptions.innerHTML = '';
  (step.options || []).forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option;
    if (step.multi && selectedServices.includes(option)) {
      button.classList.add('selected');
    }
    button.addEventListener('click', () => {
      if (step.multi) {
        selectedServices = selectedServices.includes(option)
          ? selectedServices.filter((service) => service !== option)
          : [...selectedServices, option];
        renderAssistantOptions(step);
        return;
      }
      handleAssistantAnswer(option);
    });
    assistantOptions.appendChild(button);
  });

  if (step.multi) {
    const continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.className = 'assistant-action primary';
    continueButton.textContent = selectedServices.length ? 'Continue' : 'Choose service';
    continueButton.disabled = !selectedServices.length;
    continueButton.addEventListener('click', () => handleAssistantAnswer(selectedServices.join(', ')));
    assistantOptions.appendChild(continueButton);
  }
};

const askAssistantStep = () => {
  const step = assistantSteps[assistantStep];
  if (!step) {
    finishAssistantLead();
    return;
  }
  if (assistantForm) assistantForm.hidden = false;
  addAssistantMessage(step.message);
  renderAssistantOptions(step);
  if (assistantInput) {
    assistantInput.placeholder = step.options ? 'Or type your answer...' : 'Type your answer...';
    assistantInput.focus();
  }
};

const handleAssistantAnswer = (value) => {
  const answer = String(value || '').trim();
  if (!answer) return;

  const step = assistantSteps[assistantStep];
  if (step.key === 'services') {
    const services = answer.split(',').map((service) => detectService(service.trim())).filter(Boolean);
    assistantLead.services = [...new Set(services)];
    selectedServices = [];
  } else {
    assistantLead[step.key] = answer;
  }
  addAssistantMessage(answer, 'user');
  assistantStep += 1;
  askAssistantStep();
};

const buildOwnerSummary = () => {
  const leadValue = estimateLeadValue();
  return [
    'New landscaping lead from website assistant',
    '',
    `Name: ${assistantLead.name || 'Not provided'}`,
    `Phone: ${assistantLead.phone || 'Not provided'}`,
    `Email: ${assistantLead.email || 'Not provided'}`,
    `Suburb: ${assistantLead.suburb || 'Not provided'}`,
    `Services detected: ${(assistantLead.services || []).join(', ') || 'Not sure'}`,
    `Job type: ${assistantLead.jobType || 'Not sure'}`,
    `Urgency: ${assistantLead.urgency || 'Not sure'}`,
    `Area size: ${assistantLead.size || 'Not sure'}`,
    '',
    `Client details: ${assistantLead.details || 'Not provided'}`,
    '',
    `AI lead rating: ${leadValue}`,
    'Recommended next step: Contact the client, confirm scope/photos, and provide the final quote.'
  ].join('\n');
};

const sendAssistantLead = async (summary) => {
  const response = await fetch('/api/landscape-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...assistantLead, summary })
  });

  if (!response.ok) throw new Error('Automatic lead delivery is not configured yet.');
};

const renderAssistantHandoffActions = (summary) => {
  const encodedSubject = encodeURIComponent(`New landscaping lead - ${assistantLead.name || 'Website visitor'}`);
  const encodedBody = encodeURIComponent(summary);
  const whatsappBody = encodeURIComponent(summary);

  if (assistantOptions) {
    assistantOptions.innerHTML = `
      <a class="assistant-action primary" href="mailto:${ownerEmail}?subject=${encodedSubject}&body=${encodedBody}">Send to owner email</a>
      <a class="assistant-action" href="https://wa.me/${ownerWhatsApp}?text=${whatsappBody}" target="_blank" rel="noreferrer">Send via WhatsApp</a>
      <button type="button" data-assistant-restart>Start over</button>
    `;
    assistantOptions.querySelector('[data-assistant-restart]')?.addEventListener('click', resetAssistant);
  }
};

const finishAssistantLead = async () => {
  renderAssistantOptions();
  if (assistantForm) assistantForm.hidden = true;
  const summary = buildOwnerSummary();

  addAssistantMessage(
    `<strong>Thanks, ${assistantLead.name || 'there'}.</strong>
    <span>I have enough detail to send this to the team. ${ownerName} or someone from the team will contact you ASAP to confirm timing, scope, and final pricing. Final quotes depend on access, size, green waste, materials, and the exact condition of the site.</span>`,
    'summary'
  );

  addAssistantMessage(
    `<strong>Owner-ready summary</strong>
    <span>Services: ${(assistantLead.services || []).join(', ') || 'Not sure'}</span>
    <span>Urgency: ${assistantLead.urgency || 'Not sure'}</span>
    <span>Job type: ${assistantLead.jobType || 'Not sure'}</span>
    <span>Lead rating: ${estimateLeadValue()}</span>`,
    'summary'
  );

  addAssistantMessage('Sending this lead to the owner now...');

  try {
    await sendAssistantLead(summary);
    addAssistantMessage('Done. The owner has received the lead by email. If WhatsApp Business is connected, this same summary can also be sent there automatically.');
  } catch (error) {
    addAssistantMessage('Automatic delivery is not connected in this demo yet. Use one of the handoff buttons below to send the same summary.');
    renderAssistantHandoffActions(summary);
  }
};

const resetAssistant = () => {
  Object.keys(assistantLead).forEach((key) => delete assistantLead[key]);
  assistantStep = 0;
  selectedServices = [];
  if (assistantMessages) assistantMessages.innerHTML = '';
  if (assistantForm) assistantForm.hidden = false;
  askAssistantStep();
};

const nudgeAssistant = () => {
  if (!assistant || assistantHasNudged || assistant.classList.contains('open')) return;
  assistantHasNudged = true;
  assistant.classList.add('has-nudge');
  assistantMobileTrigger?.classList.add('has-nudge');
};

if (assistant && assistantNudgeTrigger) {
  if ('IntersectionObserver' in window) {
    const assistantNudgeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          nudgeAssistant();
          assistantNudgeObserver.disconnect();
        }
      });
    }, { threshold: 0.32, rootMargin: '0px 0px -22% 0px' });

    assistantNudgeObserver.observe(assistantNudgeTrigger);
  } else {
    window.addEventListener('scroll', () => {
      const rect = assistantNudgeTrigger.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.62 && rect.bottom > window.innerHeight * 0.2) nudgeAssistant();
    }, { passive: true });
  }
}

const openAssistant = () => {
  assistant?.classList.remove('has-nudge');
  assistantMobileTrigger?.classList.remove('has-nudge');
  assistant?.classList.add('open');
  assistantLauncher?.setAttribute('aria-expanded', 'true');
  assistant?.querySelector('.assistant-panel')?.setAttribute('aria-hidden', 'false');
  if (!assistantMessages?.children.length) askAssistantStep();
};

assistantLauncher?.addEventListener('click', openAssistant);
assistantMobileTrigger?.addEventListener('click', openAssistant);

assistantClose?.addEventListener('click', () => {
  assistant?.classList.remove('open');
  assistantLauncher?.setAttribute('aria-expanded', 'false');
  assistant?.querySelector('.assistant-panel')?.setAttribute('aria-hidden', 'true');
});

assistantForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  handleAssistantAnswer(assistantInput?.value);
  if (assistantInput) assistantInput.value = '';
});

document.querySelectorAll('form:not(.assistant-form)').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.textContent = 'Request Sent';
    button.classList.add('submitted');
    form.reset();
    setTimeout(() => {
      if (modal?.open) modal.close();
      button.textContent = 'Submit Request';
      button.classList.remove('submitted');
    }, 1400);
  });
});
