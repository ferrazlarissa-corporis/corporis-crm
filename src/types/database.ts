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
  | "pilates_gestante"
  | "fisio_pelvica"
  | "indefinido";

export type ConversationMode = "ia" | "humano";
export type ConversationStatus = "aberta" | "aguardando" | "resolvida";

export type MessageDirection = "entrada" | "saida";
export type MessageAuthor = "lead" | "ia" | "humano" | "sistema";
export type MessageType = "texto" | "imagem" | "audio" | "documento" | "template";

export type AppointmentType =
  | "avaliacao_pilates"
  | "avaliacao_fisio_pelvica"
  | "avaliacao_gestante";

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

// ─── Corporis OS — core ─────────────────────────────────────────────────────────

export type PessoaTipo = "aluna" | "paciente" | "ambos";
export type PessoaStatus = "lead" | "cliente_ativo" | "inativo";
export type Pilar = "pilates" | "pilates_gestante" | "fisio_pelvica";
export type AgendaCategoria = "avaliacao" | "sessao" | "experimental";
export type PlanoTipo = "recorrente" | "personalizado";
export type Periodicidade = "mensal" | "trimestral" | "semestral" | "anual" | "avulso";
export type MatriculaStatus = "ativa" | "pausada" | "cancelada";
export type ContratoStatus = "rascunho" | "enviado" | "assinado" | "cancelado";
export type LancamentoStatus = "a_receber" | "recebido" | "atrasado";
export type DocumentoTipo = "exame" | "atestado" | "laudo" | "outro";

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
          nome: string;
          telefone: string;
          email: string | null;
          estagio: LeadStage;
          origem: LeadOrigin;
          interesse: LeadInterest;
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
          nome: string;
          telefone: string;
          email?: string | null;
          estagio?: LeadStage;
          origem?: LeadOrigin;
          interesse?: LeadInterest;
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
          p_valor: number;
          p_desconto: number;
          p_dia_vencimento: number;
          p_inicio: string;
          p_modelo_contrato_id: string | null;
          p_vendedor_id: string | null;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pessoa_id: string;
          versao?: number;
          dados?: Json;
          autor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["clinico"]["Tables"]["anamnese"]["Insert"]>;
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
}
