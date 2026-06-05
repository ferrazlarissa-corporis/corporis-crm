/* global React, ReactDOM */
const { useState } = React;

/* ——— Booking modal (interactive) ——— */
function BookingModal({ open, onClose, service }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  if (!open) return null;
  const close = () => { setStep(0); setName(""); setPhone(""); onClose(); };

  return (
    <div className="bk-backdrop" onClick={close}>
      <div className="bk-modal" onClick={e => e.stopPropagation()}>
        <button className="bk-close" onClick={close} aria-label="Fechar">×</button>

        {step === 0 && (
          <div className="bk-step">
            <span className="bk-eyebrow">Aula experimental gratuita</span>
            <h3 className="bk-title">Que bom ter você por aqui.</h3>
            <p className="bk-lead">
              Antes de marcarmos sua aula, vamos nos conhecer um pouco.
              Como você se chama?
            </p>
            <label className="bk-label">Seu nome</label>
            <input className="bk-input" value={name} onChange={e => setName(e.target.value)} placeholder="Como você gostaria de ser chamada?"/>
            <button className="btn btn--primary bk-cta" disabled={!name.trim()} onClick={() => setStep(1)}>Continuar</button>
          </div>
        )}

        {step === 1 && (
          <div className="bk-step">
            <span className="bk-eyebrow">Passo 2 de 3</span>
            <h3 className="bk-title">Olá, {name.split(" ")[0]}.</h3>
            <p className="bk-lead">
              Posso te perguntar o que te trouxe até a Corporis? Sem pressa — pode ser uma dor, uma curiosidade, indicação médica.
            </p>
            <div className="bk-chips">
              {["Dor lombar", "Pós-parto", "Postura", "Menopausa", "Indicação médica", "Outro motivo"].map(c => (
                <button key={c} className="bk-chip">{c}</button>
              ))}
            </div>
            <button className="btn btn--primary bk-cta" onClick={() => setStep(2)}>Continuar</button>
          </div>
        )}

        {step === 2 && (
          <div className="bk-step">
            <span className="bk-eyebrow">Passo 3 de 3</span>
            <h3 className="bk-title">Como entramos em contato?</h3>
            <p className="bk-lead">
              Vamos confirmar o melhor horário pelo WhatsApp. Resposta em até 2 horas em horário comercial.
            </p>
            <label className="bk-label">WhatsApp</label>
            <input className="bk-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(49) 9 9999-9999"/>
            <button className="btn btn--primary bk-cta" disabled={!phone.trim()} onClick={() => setStep(3)}>Agendar</button>
          </div>
        )}

        {step === 3 && (
          <div className="bk-step bk-step--done">
            <div className="bk-check">✓</div>
            <h3 className="bk-title">Pronto, {name.split(" ")[0]}.</h3>
            <p className="bk-lead">
              Recebemos seu contato. A Larissa ou a Tainara vai te chamar no WhatsApp em até 2h pra alinhar o melhor horário pra sua aula experimental.
            </p>
            <button className="btn btn--secondary bk-cta" onClick={close}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { BookingModal });
