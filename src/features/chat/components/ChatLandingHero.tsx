export function ChatLandingHero() {
  return (
    <div className="chat-landing-hero">
      <h2 className="chat-landing-heading">
        <span className="chat-landing-heading-emoji" aria-hidden="true">
          ✨
        </span>{' '}
        <span className="chat-landing-heading-gradient">What&apos;s on your study agenda today?</span>
      </h2>
      <p className="chat-landing-sub">
        <span className="chat-landing-sub-lead" aria-hidden="true">
          🩺{' '}
        </span>
        Pick a mode and topic, then chat—or upload a PDF/TXT. After each upload you choose summary, quiz, both, or
        specific focus before we run the model.
      </p>
    </div>
  )
}
