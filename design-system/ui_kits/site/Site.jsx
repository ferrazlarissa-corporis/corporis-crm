/* global React */
const { useState } = React;

function Nav({ onCta }) {
  return (
    <nav className="cp-nav">
      <div className="cp-nav__logo">
        <img src="../../assets/logo-cores.png" alt="Corporis Fisioterapia e Pilates"/>
      </div>
      <div className="cp-nav__links">
        <a href="#servicos">Serviços</a>
        <a href="#equipe">Equipe</a>
        <a href="#espaco">O espaço</a>
        <a href="#contato">Contato</a>
      </div>
      <button className="cp-nav__cta" onClick={onCta}>Aula experimental</button>
    </nav>
  );
}

function Hero({ onCta }) {
  return (
    <section className="cp-hero">
      <div>
        <div className="cp-hero__eyebrow">Xanxerê — Santa Catarina</div>
        <h1>Movimente-se com <em>propósito</em>.</h1>
        <p className="cp-hero__lead">
          Atendimento individual em fisioterapia e pilates, no coração de Xanxerê.
          Movimento prescrito por fisioterapeuta — para o seu corpo, no seu ritmo.
        </p>
        <div className="cp-hero__cta-row">
          <button className="btn btn--primary" onClick={onCta}>Agendar aula experimental</button>
          <button className="btn btn--secondary">Conhecer a clínica</button>
        </div>
      </div>
      <div className="cp-hero__visual">
        <div className="cp-hero__visual-ph">[ Foto da sala de pilates · luz natural matinal ]</div>
      </div>
    </section>
  );
}

function Service({ tag, title, desc, accent, onClick }) {
  return (
    <article className="cp-svc" onClick={onClick}>
      <div className="cp-svc__accent" style={{ background: accent }}/>
      <div className="cp-svc__body">
        <span className="cp-svc__tag">{tag}</span>
        <h3 className="cp-svc__title">{title}</h3>
        <p className="cp-svc__desc">{desc}</p>
        <a className="cp-svc__link">Saiba mais →</a>
      </div>
    </article>
  );
}

function Services({ onPick }) {
  return (
    <section className="cp-section" id="servicos">
      <div className="cp-section__head">
        <span className="cp-section__eyebrow">O que fazemos</span>
        <h2>Três frentes, um mesmo princípio: cuidado individual.</h2>
        <p className="cp-section__lead">
          Cada plano é construído para o seu corpo, a sua história e o seu objetivo —
          nunca exercícios genéricos.
        </p>
      </div>
      <div className="cp-services">
        <Service
          tag="Pilates"
          title="Pilates terapêutico"
          desc="Consciência corporal, alívio de dor lombar e postura. Movimento prescrito por fisioterapeuta, em turmas de até 4 alunas."
          accent="var(--color-alaranjado)"
          onClick={() => onPick("pilates")}/>
        <Service
          tag="Pilates Gestante"
          title="Pré e pós-parto"
          desc="Preparação física para o parto, alívio de desconfortos gestacionais e recuperação do assoalho pélvico no puerpério."
          accent="var(--color-verde)"
          onClick={() => onPick("gestante")}/>
        <Service
          tag="Fisio Pélvica"
          title="Cuidado discreto"
          desc="Incontinência, dor pélvica, dispareunia, menopausa. A fisioterapia pélvica trata o que muita gente ainda não fala."
          accent="var(--color-bege)"
          onClick={() => onPick("pelvica")}/>
      </div>
    </section>
  );
}

function Team() {
  return (
    <section className="cp-section cp-section--bege" id="equipe">
      <div className="cp-section__head">
        <span className="cp-section__eyebrow">Quem te atende</span>
        <h2>Fisioterapeutas formadas, com especialização documentada.</h2>
      </div>
      <div className="cp-team">
        <div className="cp-team__card">
          <div className="cp-team__photo">[ Retrato — Larissa ]</div>
          <span className="cp-team__role">Co-fundadora · Fisio Pélvica</span>
          <h3 className="cp-team__name">Larissa Ferraz</h3>
          <p className="cp-team__bio">
            Fisioterapeuta com especialização em fisioterapia pélvica e pilates clínico.
            Atende mulheres em todas as fases — gestação, pós-parto, menopausa — com escuta antes de prescrever.
          </p>
          <span className="cp-team__crp">CRP 12 / 88142</span>
        </div>
        <div className="cp-team__card">
          <div className="cp-team__photo">[ Retrato — Tainara ]</div>
          <span className="cp-team__role">Co-fundadora · Pilates Clínico</span>
          <h3 className="cp-team__name">Tainara Fracasso</h3>
          <p className="cp-team__bio">
            Fisioterapeuta especializada em pilates clínico e atendimento postural.
            Desenha protocolos de movimento para alívio de dor crônica e prevenção de lesões.
          </p>
          <span className="cp-team__crp">CRP 12 / 91204</span>
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="cp-section">
      <div className="cp-testimonial">
        <span className="cp-section__eyebrow">Depoimento de aluna</span>
        <p className="cp-testimonial__quote">
          "Vim com dor lombar há três anos. Em vez de me empurrar pra dentro de uma turma,
          a Larissa sentou comigo, escutou e construímos um plano juntas. Hoje, sem dor."
        </p>
        <span className="cp-testimonial__author">Mariana C. — aluna desde 2023</span>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="cp-footer" id="contato">
      <div>
        <img src="../../assets/logo-branco.png" alt="Corporis"/>
        <p>
          Clínica boutique de fisioterapia e pilates no Centro Médico Xanxerê.
          Atendimento individual, prescrição de movimento, ambiente acolhedor.
        </p>
      </div>
      <div className="cp-footer__col">
        <h5>Endereço</h5>
        <p>Rua Coronel Santos Marinho, 347</p>
        <p>Sala 903 · Centro Médico</p>
        <p>Xanxerê — SC</p>
      </div>
      <div className="cp-footer__col">
        <h5>Contato</h5>
        <p>WhatsApp · (49) 9 9999-9999</p>
        <p>contato@clinicacorporis.app</p>
        <p>@corporisfisiopilates</p>
      </div>
      <div className="cp-footer__col">
        <h5>Horário</h5>
        <p>Seg — Sex · 07h às 20h</p>
        <p>Sábado · 08h às 12h</p>
      </div>
      <div className="cp-footer__bottom">
        <span className="cp-footer__micro">© 2026 Corporis Fisioterapia e Pilates · Est. 2021</span>
        <span className="cp-footer__micro">CRP 12 / 88142 · CRP 12 / 91204</span>
      </div>
    </footer>
  );
}

Object.assign(window, { Nav, Hero, Service, Services, Team, Testimonial, Footer });
