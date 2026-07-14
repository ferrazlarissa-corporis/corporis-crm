"use client";

import { useEffect, useRef, useState } from "react";
import { Poppins, Ubuntu } from "next/font/google";
import { cn } from "@/lib/utils";
import { submeterAnamnesePublica } from "./actions";
import styles from "./anamnese.module.css";

const display = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-display" });
const body = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-body" });

const SAUDE_PERGUNTAS = [
  "Possui ou já teve problema cardíaco?",
  "Possui pressão alta (hipertensão)?",
  "Sente dores no peito ou falta de ar durante esforço?",
  "Já teve tontura, desmaio ou perda de equilíbrio?",
  "Possui problema respiratório (asma, bronquite etc.)?",
  "Possui diabetes?",
  "Possui osteoporose ou outro problema ósseo?",
  "Possui problema articular ou muscular?",
  "Possui hérnia de disco ou outro problema de coluna?",
  "Faz uso de medicação contínua?",
  "Está gestante?",
  "Possui alguma restrição ou orientação médica para atividade física?",
];

const ATIVIDADE_PERGUNTAS = [
  "Pratica ou já praticou atividade física regularmente?",
  "Possui atestado ou liberação médica para atividade física?",
];

type Resposta = "sim" | "nao" | null;

function FieldInput({ printing, value, onChange, placeholder, type = "text", inputMode }: {
  printing: boolean; value: string; onChange?: (v: string) => void; placeholder?: string;
  type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  if (printing) return <div className={cn(styles.field, styles.fieldFilled)}>{value}</div>;
  return (
    <input
      className={styles.field}
      type={type}
      inputMode={inputMode}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

function FieldTextarea({ printing, value, onChange, rows = 2, placeholder }: {
  printing: boolean; value: string; onChange?: (v: string) => void; rows?: number; placeholder?: string;
}) {
  if (printing) {
    return <div className={cn(styles.field, styles.fieldFilled)} style={{ minHeight: rows * 22 + 20 }}>{value}</div>;
  }
  return (
    <textarea
      className={cn(styles.field, styles.textareaField)}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.cell}>
      <label className={styles.lab}>{label}</label>
      {children}
    </div>
  );
}

function Pergunta({ texto, valor, onChange }: { texto: string; valor: Resposta; onChange: (v: Resposta) => void }) {
  return (
    <div className={styles.qrow}>
      <span className={styles.q}>{texto}</span>
      <span className={styles.pills}>
        <button type="button" className={cn(styles.pill, valor === "sim" && styles.pillSelected)} onClick={() => onChange("sim")}>Sim</button>
        <button type="button" className={cn(styles.pill, valor === "nao" && styles.pillSelected)} onClick={() => onChange("nao")}>Não</button>
      </span>
    </div>
  );
}

function Aceite({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className={cn(styles.accept, checked && styles.acceptChecked)} onClick={onToggle} role="checkbox" aria-checked={checked} tabIndex={0}>
      <span className={styles.acceptBox}>
        <svg viewBox="0 0 24 24" fill="none"><path d="M4 12.5l5 5L20 6.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <span className={styles.txt}>{children}</span>
    </div>
  );
}

export function AnamnesePublicaForm({ token, nomeConhecido }: { token: string; nomeConhecido: string }) {
  const [printing, setPrinting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [nome, setNome] = useState(nomeConhecido);
  const [nascimento, setNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [profissao, setProfissao] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [email, setEmail] = useState("");
  const [contatoEmergencia, setContatoEmergencia] = useState("");

  const [saude, setSaude] = useState<Resposta[]>(() => SAUDE_PERGUNTAS.map(() => null));
  const [saudeDetalhe, setSaudeDetalhe] = useState("");

  const [cirurgias, setCirurgias] = useState("");
  const [lesoesAtuais, setLesoesAtuais] = useState("");
  const [dorAtual, setDorAtual] = useState("");

  const [atividade, setAtividade] = useState<Resposta[]>(() => ATIVIDADE_PERGUNTAS.map(() => null));
  const [objetivos, setObjetivos] = useState("");

  const [aceiteDeclaracao, setAceiteDeclaracao] = useState(false);
  const [aceiteLgpd, setAceiteLgpd] = useState(false);

  const [localData, setLocalData] = useState("");
  const [responsavelLegal, setResponsavelLegal] = useState("");

  useEffect(() => {
    setLocalData(`Xanxerê, ${new Date().toLocaleDateString("pt-BR")}`);
  }, []);

  const sheetRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const card = canvas?.parentElement;
    if (!canvas || !card) return;
    function resize() {
      const rect = card!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const prev = hasSignature ? canvas!.toDataURL() : null;
      canvas!.width = Math.round(rect.width * dpr);
      canvas!.height = Math.round(rect.height * dpr);
      const ctx = canvas!.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#3A3530";
      if (prev) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
        img.src = prev;
      }
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = pos(e);
    if (!hasSignature) setHasSignature(true);
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d");
    const p = pos(e);
    const last = lastPointRef.current;
    if (ctx && last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    lastPointRef.current = p;
  }
  function onPointerUp() {
    drawingRef.current = false;
  }
  function limparAssinatura() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  function nomeArquivo() {
    const slug = (nome.trim() || "aluno")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    return `Ficha_Anamnese_${slug}_${new Date().toISOString().slice(0, 10)}.pdf`;
  }

  function validar(): string[] {
    const faltando: string[] = [];
    if (!nome.trim()) faltando.push("Nome completo");
    if (!aceiteDeclaracao) faltando.push("Aceite da declaração de veracidade");
    if (!aceiteLgpd) faltando.push("Consentimento LGPD");
    if (!hasSignature) faltando.push("Assinatura");
    return faltando;
  }

  async function enviar() {
    const faltando = validar();
    if (faltando.length) {
      setError(`Faltou preencher: ${faltando.join(" · ")}`);
      return;
    }
    setError(null);
    setSubmitting(true);
    setPrinting(true);
    // aguarda o próximo paint com os campos em modo "impressão" (texto, sem inputs)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const sheet = sheetRef.current!;
      const canvasImg = await html2canvas(sheet, { scale: 2, backgroundColor: "#FFFFFF", useCORS: true, logging: false });
      const pdf = new JsPDF("p", "mm", "a4");
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgW = pw;
      const imgH = (canvasImg.height * pw) / canvasImg.width;
      const data = canvasImg.toDataURL("image/jpeg", 0.92);
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(data, "JPEG", 0, position, imgW, imgH, "", "FAST");
      heightLeft -= ph;
      while (heightLeft > 0) {
        position -= ph;
        pdf.addPage();
        pdf.addImage(data, "JPEG", 0, position, imgW, imgH, "", "FAST");
        heightLeft -= ph;
      }
      const blob = pdf.output("blob");
      const pdfFile = new File([blob], nomeArquivo(), { type: "application/pdf" });

      const dados = {
        identificacao: { nome, nascimento, cpf, profissao, telefone, endereco, email, contato_emergencia: contatoEmergencia },
        historico_saude: {
          perguntas: SAUDE_PERGUNTAS.map((texto, i) => ({ pergunta: texto, resposta: saude[i] })),
          detalhamento: saudeDetalhe,
        },
        lesoes: { cirurgias, lesoes_atuais: lesoesAtuais, dor_atual: dorAtual },
        atividade: {
          perguntas: ATIVIDADE_PERGUNTAS.map((texto, i) => ({ pergunta: texto, resposta: atividade[i] })),
          objetivos,
        },
        aceites: { declaracao_em: new Date().toISOString(), lgpd_em: new Date().toISOString() },
        assinatura: { local_data: localData, responsavel_legal: responsavelLegal || null },
      };

      const fd = new FormData();
      fd.set("token", token);
      fd.set("dados", JSON.stringify(dados));
      fd.set("pdf", pdfFile);

      const r = await submeterAnamnesePublica(fd);
      if (!r.success) {
        setError(r.error);
        setPrinting(false);
        setSubmitting(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivo();
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch {
      setError("Não foi possível enviar a ficha agora. Tente novamente em instantes.");
      setPrinting(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className={cn(styles.bg, display.variable, body.variable)}>
        <div className={styles.sheet} style={{ padding: "56px 40px", textAlign: "center" }}>
          <p className={styles.headTitle} style={{ fontSize: "1.4rem" }}>Ficha recebida</p>
          <p className={styles.avisoTexto}>
            Obrigada, {nome.split(" ")[0]}. Recebemos sua ficha de anamnese assinada — o PDF também foi baixado
            no seu dispositivo. Qualquer dúvida, é só chamar a Corporis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(styles.bg, display.variable, body.variable)}>
      {error ? <div className={styles.alert}>{error}</div> : null}

      <div className={styles.sheet} ref={sheetRef}>
        <div className={styles.head}>
          <p className={styles.headTitle}>Ficha de anamnese e avaliação de saúde</p>
          <p className={styles.headSub}>Preenchimento obrigatório antes da primeira sessão</p>
        </div>

        <div className={styles.body}>
          <div className={styles.sectionBar}><span className={styles.n}>1</span>Identificação</div>
          <div className={styles.grid}>
            <Field label="Nome completo"><FieldInput printing={printing} value={nome} onChange={setNome} placeholder="Nome do aluno(a)" /></Field>
            <Field label="Data de nascimento"><FieldInput printing={printing} value={nascimento} onChange={setNascimento} placeholder="DD/MM/AAAA" /></Field>
            <Field label="CPF"><FieldInput printing={printing} value={cpf} onChange={setCpf} placeholder="000.000.000-00" /></Field>
            <Field label="Profissão"><FieldInput printing={printing} value={profissao} onChange={setProfissao} /></Field>
            <Field label="Telefone / WhatsApp"><FieldInput printing={printing} value={telefone} onChange={setTelefone} placeholder="(00) 00000-0000" /></Field>
            <div className={styles.cellFull}><Field label="Endereço"><FieldInput printing={printing} value={endereco} onChange={setEndereco} /></Field></div>
            <Field label="E-mail"><FieldInput printing={printing} value={email} onChange={setEmail} type="email" /></Field>
            <Field label="Contato de emergência"><FieldInput printing={printing} value={contatoEmergencia} onChange={setContatoEmergencia} placeholder="Nome e telefone" /></Field>
          </div>

          <div className={styles.sectionBar}><span className={styles.n}>2</span>Histórico de saúde</div>
          <p className={styles.hint}>Assinale conforme sua condição atual ou histórico.</p>
          {SAUDE_PERGUNTAS.map((q, i) => (
            <Pergunta key={q} texto={q} valor={saude[i]} onChange={(v) => setSaude((s) => s.map((x, j) => (j === i ? v : x)))} />
          ))}
          <div className={styles.cellFull} style={{ marginTop: 12 }}>
            <label className={styles.lab}>Se respondeu <b>Sim</b> a algum item, detalhe (condição, medicação, semanas de gestação etc.)</label>
            <FieldTextarea printing={printing} value={saudeDetalhe} onChange={setSaudeDetalhe} rows={3} />
          </div>

          <div className={styles.sectionBar}><span className={styles.n}>3</span>Lesões, cirurgias e dores atuais</div>
          <div className={styles.grid}>
            <div className={styles.cellFull}><Field label="Cirurgias realizadas (qual e quando)"><FieldTextarea printing={printing} value={cirurgias} onChange={setCirurgias} /></Field></div>
            <div className={styles.cellFull}><Field label="Lesões atuais ou anteriores"><FieldTextarea printing={printing} value={lesoesAtuais} onChange={setLesoesAtuais} /></Field></div>
            <div className={styles.cellFull}><Field label="Sente dor atualmente? Em qual região?"><FieldTextarea printing={printing} value={dorAtual} onChange={setDorAtual} /></Field></div>
          </div>

          <div className={styles.sectionBar}><span className={styles.n}>4</span>Atividade física e objetivos</div>
          {ATIVIDADE_PERGUNTAS.map((q, i) => (
            <Pergunta key={q} texto={q} valor={atividade[i]} onChange={(v) => setAtividade((s) => s.map((x, j) => (j === i ? v : x)))} />
          ))}
          <div className={styles.cellFull} style={{ marginTop: 12 }}>
            <label className={styles.lab}>Objetivos com o Pilates (o que busca alcançar)</label>
            <FieldTextarea printing={printing} value={objetivos} onChange={setObjetivos} rows={3} />
          </div>

          <div className={styles.sectionBar}><span className={styles.n}>5</span>Declaração de veracidade e compromisso</div>
          <Aceite checked={aceiteDeclaracao} onToggle={() => setAceiteDeclaracao((v) => !v)}>
            Declaro que as informações prestadas nesta ficha são verdadeiras e completas. Comprometo-me a informar
            imediatamente ao profissional responsável qualquer alteração no meu estado de saúde, lesão, gestação
            ou nova orientação médica durante o período de prática das atividades. Estou ciente de que a omissão
            ou inexatidão dessas informações é de minha inteira responsabilidade.
          </Aceite>

          <div className={styles.sectionBar}><span className={styles.n}>6</span>Consentimento de dados de saúde (LGPD)</div>
          <Aceite checked={aceiteLgpd} onToggle={() => setAceiteLgpd((v) => !v)}>
            Autorizo a Corporis Fisioterapia e Pilates a coletar e tratar os dados pessoais e sensíveis de saúde
            desta ficha, exclusivamente para avaliação, planejamento e execução segura das atividades contratadas
            e cumprimento de obrigações legais, nos termos da Lei nº 13.709/2018 (LGPD). Estou ciente de que meus
            dados não serão compartilhados com terceiros sem necessidade e de que posso solicitar acesso, correção
            ou eliminação a qualquer momento.
          </Aceite>

          <div className={styles.sectionBar}><span className={styles.n}>✓</span>Assinatura</div>
          <div className={styles.sigWrap}>
            <div className={styles.sigCard}>
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              />
              <div className={styles.sigBase} />
              {!hasSignature ? <div className={styles.sigPh}>Assine aqui com o dedo ou o mouse</div> : null}
              {!printing ? <button type="button" className={styles.sigClear} onClick={limparAssinatura}>Limpar assinatura</button> : null}
            </div>
            <div className={styles.sigMeta}>
              <Field label="Local e data"><FieldInput printing={printing} value={localData} onChange={setLocalData} /></Field>
              <Field label="Responsável legal, se menor de 18 anos (nome e CPF)"><FieldInput printing={printing} value={responsavelLegal} onChange={setResponsavelLegal} /></Field>
            </div>
            <div className={styles.sigLine}>Assinatura do aluno(a) ou responsável legal</div>
          </div>

          <div className={styles.foot}>Corporis Fisioterapia e Pilates · Xanxerê/SC</div>
        </div>
      </div>

      {!printing ? (
        <div className={styles.toolbar}>
          <button type="button" className={cn(styles.btn, styles.btnPrimary)} onClick={enviar} disabled={submitting}>
            {submitting ? "Enviando…" : "Enviar ficha assinada"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
