/**
 * Tipos del backend de Supabase.
 *
 * Están escritos a mano a partir de las migraciones de supabase/migrations/,
 * así que si cambias el esquema hay que actualizarlos aquí. Cuando tengas la
 * CLI enlazada al proyecto puedes regenerarlos automáticamente con:
 *
 *   npx supabase gen types typescript --linked > src/types/basedatos.ts
 *
 * (Eso sobrescribe el archivo y pierde los alias del final; convendría
 * moverlos a otro archivo el día que automatices la generación.)
 */

export type Json = string | number | boolean | null | { [clave: string]: Json } | Json[]

/* -------------------------------------------------------------------------- */
/* Valores permitidos (reflejan los CHECK del esquema)                        */
/* -------------------------------------------------------------------------- */

/** Frecuencias de un concepto de gasto. Se normalizan a mensual en el backend. */
export type Frecuencia =
  | 'dia'
  | 'semana'
  | 'quincena'
  | 'mes'
  | 'bimestre'
  | 'trimestre'
  | 'semestre'
  | 'anio'

/** Un ingreso solo puede ser mensual o quincenal. */
export type FrecuenciaIngreso = 'mes' | 'quincena'

export type TipoMeta = 'pasar_positivo' | 'fondo_emergencia' | 'meta'
export type EstadoMeta = 'bloqueada' | 'activa' | 'lograda'

export type TipoRecordatorio = 'pago' | 'tarjeta' | 'cumpleanos' | 'pico_y_placa' | 'otro'
export type Recurrencia =
  | 'diaria'
  | 'semanal'
  | 'quincenal'
  | 'mensual'
  | 'bimestral'
  | 'trimestral'
  | 'semestral'
  | 'anual'

/** Preferencia de tema guardada en el perfil. */
export type TemaPerfil = 'oscuro' | 'claro' | 'sistema'

/** Las 6 categorías fijas del presupuesto. */
export type CategoriaSlug =
  | 'gastos-del-hogar'
  | 'necesidades-basicas'
  | 'ahorro-con-proposito'
  | 'diversion-y-gastos-hormiga'
  | 'educacion-y-negocio'
  | 'deudas'

/* -------------------------------------------------------------------------- */
/* Esquema                                                                    */
/* -------------------------------------------------------------------------- */

export interface Database {
  public: {
    Tables: {
      // ---------------- Catálogos (solo lectura) ----------------
      categorias: {
        Row: {
          id: string
          nombre: string
          slug: CategoriaSlug
          porcentaje_ideal: number
          color: string
          orden: number
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      plantilla_grupos: {
        Row: {
          id: string
          categoria_id: string
          nombre: string
          orden: number
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      plantilla_conceptos: {
        Row: {
          id: string
          plantilla_grupo_id: string
          nombre: string
          orden: number
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }

      // ---------------- Tablas del usuario (RLS) ----------------
      perfiles: {
        Row: {
          id: string
          nombre: string | null
          tema: TemaPerfil
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nombre?: string | null
          tema?: TemaPerfil
        }
        Update: {
          nombre?: string | null
          tema?: TemaPerfil
        }
        Relationships: []
      }
      ingresos: {
        Row: {
          id: string
          user_id: string
          nombre: string
          monto_bruto: number
          moneda: string
          es_mensual: boolean
          frecuencia: FrecuenciaIngreso
          banco: string | null
          salud_pct: number
          pension_pct: number
          auxilio_transporte: number
          prima_anual: number
          orden: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nombre: string
          monto_bruto?: number
          moneda?: string
          es_mensual?: boolean
          frecuencia?: FrecuenciaIngreso
          banco?: string | null
          salud_pct?: number
          pension_pct?: number
          auxilio_transporte?: number
          prima_anual?: number
          orden?: number
        }
        Update: Partial<Database['public']['Tables']['ingresos']['Insert']>
        Relationships: []
      }
      deducciones_personalizadas: {
        Row: {
          id: string
          user_id: string
          ingreso_id: string
          nombre: string
          monto: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ingreso_id: string
          nombre: string
          monto?: number
        }
        Update: Partial<Database['public']['Tables']['deducciones_personalizadas']['Insert']>
        Relationships: []
      }
      bolsillos: {
        Row: {
          id: string
          user_id: string
          categoria_id: string
          nombre: string
          banco: string | null
          es_fondo_emergencia: boolean
          orden: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          categoria_id: string
          nombre: string
          banco?: string | null
          es_fondo_emergencia?: boolean
          orden?: number
        }
        Update: Partial<Database['public']['Tables']['bolsillos']['Insert']>
        Relationships: []
      }
      conceptos: {
        Row: {
          id: string
          user_id: string
          bolsillo_id: string
          nombre: string
          monto: number
          frecuencia: Frecuencia
          nota: string | null
          orden: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bolsillo_id: string
          nombre: string
          monto?: number
          frecuencia?: Frecuencia
          nota?: string | null
          orden?: number
        }
        Update: Partial<Database['public']['Tables']['conceptos']['Insert']>
        Relationships: []
      }
      metas: {
        Row: {
          id: string
          user_id: string
          tipo: TipoMeta
          nombre: string
          monto_objetivo: number
          monto_actual: number
          banco: string | null
          estado: EstadoMeta
          fecha_lograda: string | null
          orden: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tipo: TipoMeta
          nombre: string
          monto_objetivo?: number
          monto_actual?: number
          banco?: string | null
          estado?: EstadoMeta
          fecha_lograda?: string | null
          orden?: number
        }
        Update: Partial<Database['public']['Tables']['metas']['Insert']>
        Relationships: []
      }
      distribuciones: {
        Row: {
          id: string
          user_id: string
          concepto_id: string
          ingreso_id: string
          monto: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          concepto_id: string
          ingreso_id: string
          monto?: number
        }
        Update: Partial<Database['public']['Tables']['distribuciones']['Insert']>
        Relationships: []
      }
      antojos: {
        Row: {
          id: string
          user_id: string
          nombre: string
          precio: number
          foto_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nombre: string
          precio?: number
          foto_path?: string | null
        }
        Update: Partial<Database['public']['Tables']['antojos']['Insert']>
        Relationships: []
      }
      recordatorios: {
        Row: {
          id: string
          user_id: string
          tipo: TipoRecordatorio
          titulo: string
          /** Fecha sin hora, formato ISO 'YYYY-MM-DD'. */
          fecha: string
          recurrencia: Recurrencia | null
          notificar: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tipo: TipoRecordatorio
          titulo: string
          fecha: string
          recurrencia?: Recurrencia | null
          notificar?: boolean
        }
        Update: Partial<Database['public']['Tables']['recordatorios']['Insert']>
        Relationships: []
      }
    }

    Views: {
      v_conceptos_mensuales: {
        Row: {
          user_id: string
          concepto_id: string
          concepto: string
          monto: number
          frecuencia: Frecuencia
          monto_mensual: number
          bolsillo_id: string
          bolsillo: string
          es_fondo_emergencia: boolean
          categoria_id: string
          categoria_slug: CategoriaSlug
          categoria: string
          categoria_color: string
          porcentaje_ideal: number
        }
        Relationships: []
      }
      v_ingresos_netos: {
        Row: {
          user_id: string
          ingreso_id: string
          ingreso: string
          banco: string | null
          frecuencia: FrecuenciaIngreso
          monto_bruto: number
          /** Neto de un periodo (mes o quincena, según `frecuencia`). */
          neto_periodo: number
          /** Neto ya llevado a equivalente mensual. */
          neto_mensual: number
          prima_anual: number
        }
        Relationships: []
      }
      v_resumen_presupuesto: {
        Row: {
          user_id: string
          total_ingresos_netos: number
          total_prima_anual: number
          total_gastos_mensuales: number
          total_ahorro_mensual: number
          /** ingresos − gastos − ahorro. Negativo = presupuesto desbalanceado. */
          excedente: number
        }
        Relationships: []
      }
      v_resumen_por_categoria: {
        Row: {
          user_id: string
          categoria_id: string
          categoria_slug: CategoriaSlug
          categoria: string
          categoria_color: string
          orden: number
          porcentaje_ideal: number
          total_mensual: number
          ideal_en_pesos: number
          porcentaje_real: number
        }
        Relationships: []
      }
    }

    Functions: {
      /** RPC: copia la plantilla al usuario actual. Idempotente. */
      inicializar_presupuesto: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      /** Lleva un monto de cualquier frecuencia a su equivalente mensual. */
      normalizar_a_mensual: {
        Args: { monto: number; frecuencia: string }
        Returns: number
      }
      /** Neto de un ingreso propio, por id. */
      neto_ingreso: {
        Args: { p_ingreso_id: string }
        Returns: number
      }
      /** Redondea un monto en COP al múltiplo de 1.000 más cercano. */
      redondear_mil: {
        Args: { valor: number }
        Returns: number
      }
    }

    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

/* -------------------------------------------------------------------------- */
/* Alias cómodos para usar en componentes                                     */
/* -------------------------------------------------------------------------- */

type Tablas = Database['public']['Tables']
type Vistas = Database['public']['Views']

export type Categoria = Tablas['categorias']['Row']
export type PlantillaGrupo = Tablas['plantilla_grupos']['Row']
export type PlantillaConcepto = Tablas['plantilla_conceptos']['Row']

export type Perfil = Tablas['perfiles']['Row']
export type Ingreso = Tablas['ingresos']['Row']
export type DeduccionPersonalizada = Tablas['deducciones_personalizadas']['Row']
export type Bolsillo = Tablas['bolsillos']['Row']
export type Concepto = Tablas['conceptos']['Row']
export type Meta = Tablas['metas']['Row']
export type Distribucion = Tablas['distribuciones']['Row']
export type Antojo = Tablas['antojos']['Row']
export type Recordatorio = Tablas['recordatorios']['Row']

export type ConceptoMensual = Vistas['v_conceptos_mensuales']['Row']
export type IngresoNeto = Vistas['v_ingresos_netos']['Row']
export type ResumenPresupuesto = Vistas['v_resumen_presupuesto']['Row']
export type ResumenPorCategoria = Vistas['v_resumen_por_categoria']['Row']

/** Lo que devuelve la RPC inicializar_presupuesto(). */
export interface ResultadoInicializacion {
  ya_inicializado: boolean
  bolsillos_creados: number
  conceptos_creados: number
  metas_creadas: number
}
