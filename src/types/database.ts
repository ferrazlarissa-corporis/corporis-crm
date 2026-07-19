export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enums ────────────────────────────────────────────────────────────────────

export type LeadStage =
  | "novo"
  | "qualificacao"
  | "avaliacao_agendada"
  | "no_show"
  | "negociacao"
  | "convertido"
  | "perdido";

export type LeadOrigin =
  | "whatsapp"
  | "instagram"
  | "indicacao"
  | "google"
  | "outro";

export type LeadInterest =
  | "pilates"
  | "fisio_pelvica"
  | "acupuntura"
  | "indefinido";

export type ConversationMode = "ia" | "humano";
export type ConversationStatus = "aberta" | "aguardando" | "resolvida";

export type MessageDirection = "entrada" | "saida";
export type MessageAuthor = "lead" | "ia" | "humano" | "sistema";
export type MessageType = "texto" | "imagem" | "audio" | "documento" | "template";

export type AppointmentType =
  | "avaliacao_pilates"
  | "avaliacao_fisio_pelvica"
  | "avaliacao_acupuntura";

export type AppointmentStatus =
  | "agendado"
  | "confirmado"
  | "compareceu"
  | "faltou"
  | "cancelado";

export type ActivityType =
  | "mensagem"
  | "mudanca_estagio"
  | "agendamento"
  | "nota"
  | "campanha"
  | "handoff"
  | "sistema";

export type CampaignStatus = "rascunho" | "agendada" | "enviando" | "concluida";
export type TemplateCategory = "lembrete" | "confirmacao" | "reativacao" | "boas_vindas";

// ─── Corporis Conteúdo ──────────────────────────────────────────────────────────

export type IdeiaOrigem = "manual" | "import" | "sugestao";
export type IdeiaStatus = "nova" | "selecionada" | "virou_post" | "descartada";
export type ReferenciaOrigem = "manual" | "descoberta";
export type TipoTemplate = "capa" | "conteudo" | "citacao" | "cta";
export type FormatoPost = "carrossel" | "estatico";
export type StatusPost =
  | "rascunho"
  | "briefing"
  | "gerando"
  | "previa"
  | "em_aprovacao"
  | "aprovado"
  | "reprovado"
  | "agendado"
  | "publicado"
  | "erro"
  | "arquivado";
export type ProvedorGeracao = "gemini" | "openai";
export type StatusGeracao = "fila" | "processando" | "pronto" | "erro";
export type ResultadoConformidade = "ok" | "alerta" | "bloqueio";
export type StatusSlot = "vazio" | "rascunho" | "agendado" | "aprovado" | "publicado";

// ─── Corporis OS — core ─────────────────────────────────────────────────────────

export type PessoaTipo = "aluna" | "paciente" | "ambos";
export type PessoaStatus = "lead" | "cliente_ativo" | "inativo";
export type Pilar = "pilates" | "fisio_pelvica" | "acupuntura";
export type AgendaCategoria = "avaliacao" | "sessao" | "experimental";
export type PlanoTipo = "fixo" | "personalizado" | "avulso";
export type Periodicidade = "mensal" | "trimestral" | "semestral" | "anual" | "avulso";
export type MatriculaStatus = "ativa" | "pausada" | "cancelada" | "concluida";
export type CobrancaModo = "unica" | "parcelada_mensal";
export type ContratoStatus = "rascunho" | "enviado" | "assinado" | "cancelado";
export type LancamentoStatus = "a_receber" | "recebido" | "atrasado";
export type DocumentoTipo = "exame" | "atestado" | "laudo" | "outro";
export type AnamneseOrigem = "staff" | "publico";

// ─── Database ─────────────────────────────────────────────────────────────────

export interface Database {
  crm: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nome: string;
          email: string;
          avatar_url: string | null;
          role: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nome: string;
          email: string;
          avatar_url?: string | null;
          role?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["crm"]["Tables"]["profiles"]["Insert"]>;
      };
      leads: {
        Row: {
          id: string;
          pessoa_id: string;
          nome: string;
          telefone: string;
          email: string | null;
          estagio: LeadStage;
          origem: LeadOrigin;
          interesse: LeadInterest;
          gestante: boolean;
          motivo_perda: string | null;
          score_qualificacao: number | null;
          responsavel_id: string | null;
          ultima_interacao_at: string | null;
          archived_at: string | null;
          contexto_avaliacao: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pessoa_id?: string;
          nome: string;
          telefone: string;
          email?: string | null;
          estagio?: LeadStage;
          origem?: LeadOrigin;
          interesse?: LeadInterest;
          gestante?: boolean;
          motivo_perda?: string | null;
          score_qualificacao?: number | null;
          responsavel_id?: string | null;
          ultima_interacao_at?: string | null;
          archived_at?: string | null;
          contexto_avaliacao?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["crm"]["Tables"]["leads"]["Insert"]>;
      };
      conversations: {
        Row: {
          id: string;
          lead_id: string;
          evolution_chat_id: string;
          modo: ConversationMode;
          status: ConversationStatus;
          nao_lida: boolean;
          janela_24h_expira_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          evolution_chat_id: string;
          modo?: ConversationMode;
          status?: ConversationStatus;
          nao_lida?: boolean;
          janela_24h_expira_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["crm"]["Tables"]["conversations"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          direcao: MessageDirection;
          autor: MessageAuthor;
          conteudo: string;
          tipo: MessageType;
          media_url: string | null;
          evolution_message_id: string | null;
          entregue_at: string | null;
          lida_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          direcao: MessageDirection;
          autor: MessageAuthor;
          conteudo: string;
          tipo?: MessageType;
          media_url?: string | null;
          evolution_message_id?: string | null;
          entregue_at?: string | null;
          lida_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["crm"]["Tables"]["messages"]["Insert"]>;
      };
      appointments: {
        Row: {
          id: string;
          lead_id: string | null;
          inicio: string;
          fim: string;
          tipo: AppointmentType;
          status: AppointmentStatus;
          profissional_id: string | null;
          observacoes: string | null;
          pessoa_id: string | null;
          servico_id: string | null;
          sala_id: string | null;
          matricula_id: string | null;
          categoria: AgendaCategoria;
          recorrencia: Json | null;
          lembrete_enviado_at: string | null;
          confirmacao_enviada_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id?: string | null;
          inicio: string;
          fim: string;
          tipo: AppointmentType;
          status?: AppointmentStatus;
          profissional_id?: string | null;
          observacoes?: string | null;
          pessoa_id?: string | null;
          servico_id?: string | null;
          sala_id?: string | null;
          matricula_id?: string | null;
          categoria?: AgendaCategoria;
          recorrencia?: Json | null;
          lembrete_enviado_at?: string | null;
          confirmacao_enviada_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["crm"]["Tables"]["appointments"]["Insert"]>;
      };
      activities: {
        Row: {
          id: string;
          lead_id: string;
          tipo: ActivityType;
          descricao: string;
          meta: Json;
          autor_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          tipo: ActivityType;
          descricao: string;
          meta?: Json;
          autor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["crm"]["Tables"]["activities"]["Insert"]>;
      };
      message_templates: {
        Row: {
          id: string;
          nome: string;
          categoria: TemplateCategory;
          conteudo: string;
          aprovado_whatsapp: boolean;
          whatsapp_template_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          categoria: TemplateCategory;
          conteudo: string;
          aprovado_whatsapp?: boolean;
          whatsapp_template_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["crm"]["Tables"]["message_templates"]["Insert"]>;
      };
      campaigns: {
        Row: {
          id: string;
          nome: string;
          descricao: string;
          segmento: Json;
          template_id: string | null;
          status: CampaignStatus;
          agendada_para: string | null;
          total_alvos: number;
          total_enviados: number;
          total_respostas: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string;
          segmento?: Json;
          template_id?: string | null;
          status?: CampaignStatus;
          agendada_para?: string | null;
          total_alvos?: number;
          total_enviados?: number;
          total_respostas?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["crm"]["Tables"]["campaigns"]["Insert"]>;
      };
      agent_config: {
        Row: {
          id: string;
          persona_prompt: string;
          ativo: boolean;
          horario_atendimento: Json;
          mensagem_fora_horario: string;
          faq: Json;
          regras_handoff: Json;
          exemplos_conversa: Json;
          model_provider: string;
          model_id: string;
          apenas_desconhecidos: boolean;
          numeros_bypass: Json;
          boas_praticas: Json;
          mensagem_handoff_agendamento: string | null;
          notificacao_handoff: Json;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          persona_prompt: string;
          ativo?: boolean;
          horario_atendimento?: Json;
          mensagem_fora_horario?: string;
          faq?: Json;
          regras_handoff?: Json;
          exemplos_conversa?: Json;
          model_provider?: string;
          model_id?: string;
          apenas_desconhecidos?: boolean;
          numeros_bypass?: Json;
          boas_praticas?: Json;
          mensagem_handoff_agendamento?: string | null;
          notificacao_handoff?: Json;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["crm"]["Tables"]["agent_config"]["Insert"]>;
      };
      clinic_config: {
        Row: {
          id: string;
          razao_social: string;
          documento: string;
          nome_comercial: string;
          endereco: string;
          endereco_complemento: string;
          telefone: string;
          telefone_observacao: string;
          email: string;
          funcionamento: Json;
          logo_url: string | null;
          logo_path: string | null;
          logo_mime_type: string | null;
          logo_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          razao_social?: string;
          documento?: string;
          nome_comercial?: string;
          endereco?: string;
          endereco_complemento?: string;
          telefone?: string;
          telefone_observacao?: string;
          email?: string;
          funcionamento?: Json;
          logo_url?: string | null;
          logo_path?: string | null;
          logo_mime_type?: string | null;
          logo_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["crm"]["Tables"]["clinic_config"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  core: {
    Tables: {
      pessoa: {
        Row: {
          id: string;
          nome: string;
          cpf: string | null;
          nascimento: string | null;
          telefone: string | null;
          email: string | null;
          genero: string | null;
          profissao: string | null;
          tipo: PessoaTipo;
          status: PessoaStatus;
          pilar_principal: Pilar | null;
          responsavel_id: string | null;
          consentimento_lgpd_at: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          cpf?: string | null;
          nascimento?: string | null;
          telefone?: string | null;
          email?: string | null;
          genero?: string | null;
          profissao?: string | null;
          tipo?: PessoaTipo;
          status?: PessoaStatus;
          pilar_principal?: Pilar | null;
          responsavel_id?: string | null;
          consentimento_lgpd_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["core"]["Tables"]["pessoa"]["Insert"]>;
      };
      endereco: {
        Row: {
          id: string;
          pessoa_id: string;
          cep: string | null;
          logradouro: string | null;
          numero: string | null;
          complemento: string | null;
          bairro: string | null;
          cidade: string | null;
          uf: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pessoa_id: string;
          cep?: string | null;
          logradouro?: string | null;
          numero?: string | null;
          complemento?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          uf?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["core"]["Tables"]["endereco"]["Insert"]>;
      };
      servico: {
        Row: {
          id: string;
          nome: string;
          pilar: Pilar;
          gestante: boolean;
          duracao_min: number;
          capacidade_slot: number;
          cor_token: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          pilar: Pilar;
          gestante?: boolean;
          duracao_min?: number;
          capacidade_slot?: number;
          cor_token?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["core"]["Tables"]["servico"]["Insert"]>;
      };
      sala: {
        Row: {
          id: string;
          nome: string;
          capacidade: number;
          equipamentos: Json;
          pilares: Json;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          capacidade?: number;
          equipamentos?: Json;
          pilares?: Json;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["core"]["Tables"]["sala"]["Insert"]>;
      };
      profissional: {
        Row: {
          id: string;
          profile_id: string | null;
          nome: string;
          especialidade: string | null;
          crefito: string | null;
          pilares: Json;
          disponibilidade: Json;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          nome: string;
          especialidade?: string | null;
          crefito?: string | null;
          pilares?: Json;
          disponibilidade?: Json;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["core"]["Tables"]["profissional"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  vendas: {
    Tables: {
      plano: {
        Row: {
          id: string;
          nome: string;
          tipo: PlanoTipo;
          valor: number;
          periodicidade: Periodicidade;
          sessoes_semana: number | null;
          servicos: Json;
          pilar: Pilar | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          tipo?: PlanoTipo;
          valor: number;
          periodicidade?: Periodicidade;
          sessoes_semana?: number | null;
          servicos?: Json;
          pilar?: Pilar | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["vendas"]["Tables"]["plano"]["Insert"]>;
      };
      plano_preco: {
        Row: {
          id: string;
          plano_id: string;
          sessoes_semana: number;
          valor_total: number;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plano_id: string;
          sessoes_semana: number;
          valor_total: number;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["vendas"]["Tables"]["plano_preco"]["Insert"]>;
      };
      venda: {
        Row: {
          id: string;
          pessoa_id: string;
          plano_id: string | null;
          valor: number;
          desconto: number;
          data: string;
          vendedor_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pessoa_id: string;
          plano_id?: string | null;
          valor: number;
          desconto?: number;
          data?: string;
          vendedor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["vendas"]["Tables"]["venda"]["Insert"]>;
      };
      matricula: {
        Row: {
          id: string;
          pessoa_id: string;
          plano_id: string;
          venda_id: string | null;
          inicio: string;
          renovacao: string | null;
          dia_vencimento: number | null;
          status: MatriculaStatus;
          tipo: PlanoTipo;
          periodicidade: Periodicidade | null;
          valor: number | null;
          valor_total: number | null;
          forma_pagamento: string | null;
          cobranca_modo: CobrancaModo | null;
          sessoes_semana: number | null;
          total_sessoes: number | null;
          fim: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pessoa_id: string;
          plano_id: string;
          venda_id?: string | null;
          inicio?: string;
          renovacao?: string | null;
          dia_vencimento?: number | null;
          status?: MatriculaStatus;
          tipo?: PlanoTipo;
          periodicidade?: Periodicidade | null;
          valor?: number | null;
          valor_total?: number | null;
          forma_pagamento?: string | null;
          cobranca_modo?: CobrancaModo | null;
          sessoes_semana?: number | null;
          total_sessoes?: number | null;
          fim?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["vendas"]["Tables"]["matricula"]["Insert"]>;
      };
      contrato_modelo: {
        Row: {
          id: string;
          nome: string;
          corpo: string;
          pilares: Json;
          planos: Json;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          corpo: string;
          pilares?: Json;
          planos?: Json;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["vendas"]["Tables"]["contrato_modelo"]["Insert"]>;
      };
      contrato: {
        Row: {
          id: string;
          pessoa_id: string;
          modelo_id: string | null;
          venda_id: string | null;
          corpo_gerado: string | null;
          status: ContratoStatus;
          zapsign_doc_id: string | null;
          via_assinada_url: string | null;
          enviado_at: string | null;
          assinado_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pessoa_id: string;
          modelo_id?: string | null;
          venda_id?: string | null;
          corpo_gerado?: string | null;
          status?: ContratoStatus;
          zapsign_doc_id?: string | null;
          via_assinada_url?: string | null;
          enviado_at?: string | null;
          assinado_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["vendas"]["Tables"]["contrato"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      criar_adesao: {
        Args: {
          p_pessoa_id: string;
          p_plano_id: string;
          p_valor_total: number;
          p_desconto_total: number;
          p_dia_vencimento: number;
          p_inicio: string;
          p_modelo_contrato_id: string | null;
          p_vendedor_id: string | null;
          p_tipo: PlanoTipo;
          p_periodicidade: Periodicidade | null;
          p_sessoes_semana: number | null;
          p_total_sessoes: number | null;
          p_forma_pagamento: string;
          p_cobranca_modo: CobrancaModo;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  financeiro: {
    Tables: {
      lancamento: {
        Row: {
          id: string;
          pessoa_id: string;
          matricula_id: string | null;
          competencia: string;
          descricao: string;
          valor: number;
          vencimento: string;
          status: LancamentoStatus;
          recebido_at: string | null;
          finance_tx_external_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pessoa_id: string;
          matricula_id?: string | null;
          competencia: string;
          descricao: string;
          valor: number;
          vencimento: string;
          status?: LancamentoStatus;
          recebido_at?: string | null;
          finance_tx_external_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["financeiro"]["Tables"]["lancamento"]["Insert"]>;
      };
      finance_map: {
        Row: { pilar: Pilar; chart_code: string; created_at: string };
        Insert: { pilar: Pilar; chart_code: string; created_at?: string };
        Update: Partial<Database["financeiro"]["Tables"]["finance_map"]["Insert"]>;
      };
    };
    Views: {
      resumo_mensal: {
        Row: {
          mes: string | null;
          recebido: number | null;
          em_aberto: number | null;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  clinico: {
    Tables: {
      anamnese: {
        Row: {
          id: string;
          pessoa_id: string;
          versao: number;
          dados: Json;
          autor_id: string | null;
          pdf_path: string | null;
          assinado_at: string | null;
          origem: AnamneseOrigem;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pessoa_id: string;
          versao?: number;
          dados?: Json;
          autor_id?: string | null;
          pdf_path?: string | null;
          assinado_at?: string | null;
          origem?: AnamneseOrigem;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["clinico"]["Tables"]["anamnese"]["Insert"]>;
      };
      anamnese_convite: {
        Row: {
          id: string;
          pessoa_id: string;
          token: string;
          expira_em: string;
          usado_at: string | null;
          criado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pessoa_id: string;
          token?: string;
          expira_em: string;
          usado_at?: string | null;
          criado_por?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["clinico"]["Tables"]["anamnese_convite"]["Insert"]>;
      };
      evolucao: {
        Row: {
          id: string;
          pessoa_id: string;
          agendamento_id: string | null;
          profissional_id: string | null;
          servico_id: string | null;
          texto: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pessoa_id: string;
          agendamento_id?: string | null;
          profissional_id?: string | null;
          servico_id?: string | null;
          texto: string;
          created_at?: string;
        };
        Update: Partial<Database["clinico"]["Tables"]["evolucao"]["Insert"]>;
      };
      documento: {
        Row: {
          id: string;
          pessoa_id: string;
          tipo: DocumentoTipo;
          nome: string;
          storage_path: string;
          tamanho: number | null;
          uploaded_by: string | null;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pessoa_id: string;
          tipo?: DocumentoTipo;
          nome: string;
          storage_path: string;
          tamanho?: number | null;
          uploaded_by?: string | null;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["clinico"]["Tables"]["documento"]["Insert"]>;
      };
      acesso_log: {
        Row: {
          id: number;
          pessoa_id: string;
          tabela: string;
          acao: string;
          ator_id: string | null;
          at: string;
        };
        Insert: {
          id?: number;
          pessoa_id: string;
          tabela: string;
          acao: string;
          ator_id?: string | null;
          at?: string;
        };
        Update: Partial<Database["clinico"]["Tables"]["acesso_log"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  conteudo: {
    Tables: {
      pilar_editorial: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          cor_token: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          cor_token: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["conteudo"]["Tables"]["pilar_editorial"]["Insert"]>;
      };
      template_slide: {
        Row: {
          id: string;
          nome: string;
          tipo: TipoTemplate;
          layout_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          tipo: TipoTemplate;
          layout_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["conteudo"]["Tables"]["template_slide"]["Insert"]>;
      };
      ideia: {
        Row: {
          id: string;
          titulo: string;
          angulo: string | null;
          pilar_id: string | null;
          publico_alvo: string | null;
          origem: IdeiaOrigem;
          status: IdeiaStatus;
          notas: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          angulo?: string | null;
          pilar_id?: string | null;
          publico_alvo?: string | null;
          origem?: IdeiaOrigem;
          status?: IdeiaStatus;
          notas?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["conteudo"]["Tables"]["ideia"]["Insert"]>;
      };
      referencia: {
        Row: {
          id: string;
          url: string;
          fonte: string | null;
          print_url: string | null;
          pilar_id: string | null;
          por_que_funciona: string | null;
          origem: ReferenciaOrigem;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          fonte?: string | null;
          print_url?: string | null;
          pilar_id?: string | null;
          por_que_funciona?: string | null;
          origem?: ReferenciaOrigem;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["conteudo"]["Tables"]["referencia"]["Insert"]>;
      };
      post: {
        Row: {
          id: string;
          titulo: string;
          formato: FormatoPost;
          pilar_id: string | null;
          ideia_id: string | null;
          briefing: string | null;
          legenda: string | null;
          hashtags: string[];
          status: StatusPost;
          aprovado_por: string | null;
          agendado_para: string | null;
          publicado_em: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          formato: FormatoPost;
          pilar_id?: string | null;
          ideia_id?: string | null;
          briefing?: string | null;
          legenda?: string | null;
          hashtags?: string[];
          status?: StatusPost;
          aprovado_por?: string | null;
          agendado_para?: string | null;
          publicado_em?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["conteudo"]["Tables"]["post"]["Insert"]>;
      };
      post_slide: {
        Row: {
          id: string;
          post_id: string;
          ordem: number;
          template_id: string | null;
          texto_titulo: string | null;
          texto_corpo: string | null;
          fundo_geracao_id: string | null;
          imagem_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          ordem: number;
          template_id?: string | null;
          texto_titulo?: string | null;
          texto_corpo?: string | null;
          fundo_geracao_id?: string | null;
          imagem_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["conteudo"]["Tables"]["post_slide"]["Insert"]>;
      };
      geracao_imagem: {
        Row: {
          id: string;
          post_id: string;
          slide_id: string | null;
          prompt: string;
          provedor: ProvedorGeracao;
          modelo: string | null;
          versao: number;
          status: StatusGeracao;
          imagem_url: string | null;
          custo: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          slide_id?: string | null;
          prompt: string;
          provedor: ProvedorGeracao;
          modelo?: string | null;
          versao?: number;
          status?: StatusGeracao;
          imagem_url?: string | null;
          custo?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["conteudo"]["Tables"]["geracao_imagem"]["Insert"]>;
      };
      checklist_conformidade: {
        Row: {
          id: string;
          post_id: string;
          regra: string;
          resultado: ResultadoConformidade;
          detalhe: string | null;
          consentimento_lgpd_ref: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          regra: string;
          resultado: ResultadoConformidade;
          detalhe?: string | null;
          consentimento_lgpd_ref?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["conteudo"]["Tables"]["checklist_conformidade"]["Insert"]>;
      };
      slot_calendario: {
        Row: {
          id: string;
          data: string;
          horario: string | null;
          pilar_sugerido: string | null;
          post_id: string | null;
          status: StatusSlot;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          data: string;
          horario?: string | null;
          pilar_sugerido?: string | null;
          post_id?: string | null;
          status?: StatusSlot;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["conteudo"]["Tables"]["slot_calendario"]["Insert"]>;
      };
      publicacao: {
        Row: {
          id: string;
          post_id: string;
          ig_media_id: string | null;
          publicado_em: string | null;
          canal: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          ig_media_id?: string | null;
          publicado_em?: string | null;
          canal?: string;
          created_at?: string;
        };
        Update: Partial<Database["conteudo"]["Tables"]["publicacao"]["Insert"]>;
      };
      metrica: {
        Row: {
          id: string;
          post_id: string;
          data: string;
          alcance: number | null;
          impressoes: number | null;
          curtidas: number | null;
          saves: number | null;
          comentarios: number | null;
          visitas_perfil: number | null;
          cliques_link: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          data: string;
          alcance?: number | null;
          impressoes?: number | null;
          curtidas?: number | null;
          saves?: number | null;
          comentarios?: number | null;
          visitas_perfil?: number | null;
          cliques_link?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["conteudo"]["Tables"]["metrica"]["Insert"]>;
      };
      cta_lead: {
        Row: {
          id: string;
          post_id: string;
          short_code: string;
          cliques: number;
          pessoa_id: string | null;
          virou_agendamento: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          short_code: string;
          cliques?: number;
          pessoa_id?: string | null;
          virou_agendamento?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["conteudo"]["Tables"]["cta_lead"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
