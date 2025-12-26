export function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="message-bubble-received">
        <div className="typing-indicator py-1">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}
