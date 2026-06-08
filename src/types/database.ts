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
          lead_id: string;
          inicio: string;
          fim: string;
          tipo: AppointmentType;
          status: AppointmentStatus;
          profissional_id: string | null;
          observacoes: string | null;
          lembrete_enviado_at: string | null;
          confirmacao_enviada_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          inicio: string;
          fim: string;
          tipo: AppointmentType;
          status?: AppointmentStatus;
          profissional_id?: string | null;
          observacoes?: string | null;
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
}
