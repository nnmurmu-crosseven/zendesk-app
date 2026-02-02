import { InferInsertModel, InferSelectModel, relations, sql } from 'drizzle-orm'

import {
  bigint,
  boolean,
  date,
  decimal,
  index,
  integer,
  json,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  real,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const documentStatusEnum = pgEnum('document_status', [
  'draft',
  'published',
  'archived',
])

export const userFilterPreferences = pgTable(
  'user_filter_preferences',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    name: varchar('name', { length: 255 }), // Filter name
    pageKey: varchar('page_key', { length: 255 }).notNull(), // Identifies which page the filters are for
    filters: json('filters').notNull(), // Store filters as JSON
    isShared: boolean('is_shared').default(false), // Whether this filter is shared with other admins
    isPinned: boolean('is_pinned').default(false), // Whether this filter is pinned
    isDefault: boolean('is_default').default(false), // Whether this filter is the default for the user on this page
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    // Create unique index on userId, name, and pageKey
    // (allows multiple saved filters per user per page as long as names are unique)
    userPageNameIdx: uniqueIndex(
      'user_filter_preferences_user_page_name_idx'
    ).on(t.userId, t.pageKey, t.name),
    // Add index for faster lookups of shared filters
    sharedFiltersIdx: index('shared_filters_idx').on(t.isShared),
    // Add index for page key to quickly find all filters for a page
    pageKeyIdx: index('page_key_idx').on(t.pageKey),
    // Add index for pinned filters
    pinnedFiltersIdx: index('pinned_filters_idx').on(t.isPinned),
  })
)

export type UserFilterPreference = typeof userFilterPreferences.$inferSelect
export type NewUserFilterPreference = typeof userFilterPreferences.$inferInsert

export const providerFilterPreferences = pgTable(
  'provider_filter_preferences',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id), // Provider ID (nullable for admin-created global filters)
    name: varchar('name', { length: 255 }), // Filter name
    pageKey: varchar('page_key', { length: 255 }).notNull(), // Identifies which page the filters are for
    filters: json('filters').notNull(), // Store filters as JSON
    isPinned: boolean('is_pinned').default(false), // Whether this filter is pinned
    isDefault: boolean('is_default').default(false), // Whether this filter is the default for all providers
    // Admin-managed filter columns
    targetProviderIds: integer('target_provider_ids').array(), // Array of provider IDs this filter applies to (null + isDefault = ALL providers)
    createdByAdminId: integer('created_by_admin_id').references(() => users.id), // Admin who created this (null = provider created it)
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    // Create unique index on name and pageKey for admin filters
    providerPageNameIdx: uniqueIndex(
      'provider_filter_preferences_user_page_name_idx'
    ).on(t.userId, t.pageKey, t.name),
    // Add index for page key to quickly find all filters for a page
    providerPageKeyIdx: index('provider_page_key_idx').on(t.pageKey),
    // Add index for pinned filters
    providerPinnedFiltersIdx: index('provider_pinned_filters_idx').on(
      t.isPinned
    ),
    // Add index for admin-created filters
    adminCreatedIdx: index('provider_filter_admin_created_idx').on(
      t.createdByAdminId
    ),
    // Add index for default filters
    defaultFilterIdx: index('provider_filter_default_idx').on(t.isDefault),
  })
)

export const settings = pgTable(
  'settings',
  {
    id: serial('id').primaryKey(),
    key: varchar('key', { length: 255 }).unique(),
    value: text('value'),
  },
  (t) => ({
    keyIdx: index('settings_key_idx').on(t.key),
  })
)

export const roleEnum = pgEnum('role', ['admin', 'provider', 'outsider'])
export const subRoleEnum = pgEnum('subRole', [
  'doctor',
  'superAdmin',
  'careTeam',
  'admin',
  'disputeHandler',
])

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    calComEmail: varchar('cal_com_email', { length: 255 }),
    name: varchar('name', { length: 255 }), //full text index
    hashedPassword: varchar('hashed_password', { length: 255 }),
    avatar: varchar('avatar', { length: 255 }),
    role: roleEnum('role'), //index
    subRole: subRoleEnum('sub_role'),
    canSeeAiAnalysis: boolean('can_see_ai_analysis').default(true),
    canReview: boolean('can_review').default(false),
    canRefund: boolean('can_refund').default(false),
    isNewTaskPageVisible: boolean('is_new_task_page_visible').default(true),
    isActive: boolean('is_active').default(true), //index
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    emailIdx: index('user_email_idx').on(t.email),
    roleIdx: uniqueIndex('user_id_idx').on(t.id, t.role),
    subRoleIdx: index('user_sub_role_idx').on(t.subRole),
    nameSearchIndex: index('title_search_index').using(
      'gin',
      sql`to_tsvector('english', ${t.name})`
    ),
    isActiveIdx: index('user_is_active_idx').on(t.isActive),
  })
)
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export const labels = pgTable('labels', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  for: varchar('for', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
    () => new Date()
  ),
})

export const emailVerificationCodes = pgTable(
  'email_verification_codes',
  {
    id: serial('id').primaryKey(),
    userId: varchar('user_id', { length: 21 }),
    email: varchar('email', { length: 255 }).notNull(),
    code: varchar('code', { length: 8 }).notNull(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
  },
  (t) => ({
    userIdx: index('verification_code_user_idx').on(t.userId),
    emailIdx: index('verification_code_email_idx').on(t.email),
  })
)

export const adminAnalytics = pgTable('admin_analytics', {
  id: serial('id').primaryKey(),
  date: varchar('date', { length: 255 }).notNull(),

  // Revenue and Payment Fields
  grossRevenue: numeric('gross_revenue', { precision: 10, scale: 2 })
    .$type<string | number>()
    .notNull(),
  netRevenue: numeric('net_revenue', { precision: 10, scale: 2 })
    .$type<string | number>()
    .notNull(),
  totalPayments: numeric('total_payments', { precision: 10, scale: 2 })
    .$type<string | number>()
    .notNull(),
  stripeFees: numeric('stripe_fees', { precision: 10, scale: 2 })
    .$type<string | number>()
    .notNull(),

  // Ad Spend Fields
  googleAdSpend: numeric('google_ad_spend', { precision: 10, scale: 2 })
    .$type<string | number>()
    .default('0'),
  metaAdSpend: numeric('meta_ad_spend', { precision: 10, scale: 2 })
    .$type<string | number>()
    .default('0'),
  bingAdSpend: numeric('bing_ad_spend', { precision: 10, scale: 2 })
    .$type<string | number>()
    .default('0'),

  // Cost and Fees Fields
  costZenith: numeric('cost_zenith', { precision: 10, scale: 2 })
    .$type<string | number>()
    .default('0'),
  supportAmount: numeric('support_amount', { precision: 10, scale: 2 })
    .$type<string | number>()
    .default('0'),
  providerPerConsultFees: numeric('provider_per_consult_fees', {
    precision: 10,
    scale: 2,
  })
    .$type<string | number>()
    .default('0'),
  providerFlatFees: numeric('provider_flat_fees', { precision: 10, scale: 2 })
    .$type<string | number>()
    .default('0'),

  // Profit and Metrics Fields
  grossProfit: numeric('gross_profit', { precision: 10, scale: 2 })
    .$type<string | number>()
    .default('0'),
  roas: numeric('roas', { precision: 10, scale: 2 })
    .$type<string | number>()
    .default('0'),
  cpaAmount: numeric('cpa_amount', { precision: 10, scale: 2 })
    .$type<string | number>()
    .default('0'),
  clicks: numeric('clicks', { precision: 10, scale: 2 })
    .$type<string | number>()
    .default('0'),
  conversionRate: numeric('conversion_rate', { precision: 10, scale: 2 })
    .$type<string | number>()
    .default('0'),
  intakeSubmits: numeric('intake_submits', { precision: 10, scale: 2 })
    .$type<string | number>()
    .default('0'),
  intakeConversionRate: numeric('intake_conversion_rate', {
    precision: 10,
    scale: 2,
  })
    .$type<string | number>()
    .default('0'),
  miscellaneousAmount: numeric('miscellaneous_amount', {
    precision: 10,
    scale: 2,
  })
    .$type<string | number>()
    .default('0'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: false })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false })
    .defaultNow()
    .notNull(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(), //index
  },
  (t) => ({
    userIdx: index('session_user_idx').on(t.userId),
    expiresAtIdx: index('session_expires_at_idx').on(t.expiresAt),
  })
)

export const brands = pgTable(
  'brands',
  {
    id: serial('id').primaryKey(),
    brandName: varchar('brand_name', { length: 255 }).notNull(),
    brandCode: varchar('brand_code', { length: 255 }).default('parkingmd'),
    url: varchar('url', { length: 255 }),
    webhookUrl: varchar('webhook_url', { length: 255 }),
    emailLayout: text('email_layout'),
    smtpHost: varchar('smtp_host', { length: 255 }),
    smtpPort: integer('smtp_port'),
    smtpUser: varchar('smtp_user', { length: 255 }),
    smtpPassword: varchar('smtp_password', { length: 255 }),
    smtpFromEmail: varchar('smtp_from_email', { length: 255 }),
    checkoutLink: varchar('checkout_link', { length: 255 }),
    twilioAccountSid: varchar('twilio_account_sid', { length: 255 }),
    twilioAuthToken: varchar('twilio_auth_token', { length: 255 }),
    twilioFromNumber: varchar('twilio_from_number', { length: 255 }),
    twilioTwimlAppSid: varchar('twilio_twiml_app_sid', { length: 255 }),
  },
  (t) => ({
    brandCodeIdx: index('brand_code_idx').on(t.brandCode),
  })
)

// like create full text index  or else it will be regular index
export const patients = pgTable(
  'patients',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 255 }),

    brandCode: varchar('brand_code', { length: 255 }).default('parkingmd'),

    firstName: varchar('first_name', { length: 255 }).notNull(),
    middleName: varchar('middle_name', { length: 255 }),
    lastName: varchar('last_name', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull(),

    password: varchar('password', { length: 255 }),
    phone: varchar('phone', { length: 255 }),
    alternate_phone: varchar('alternate_phone', { length: 255 }),

    address: varchar('address', { length: 255 }),
    apartment: varchar('apartment', { length: 255 }),
    city: varchar('city', { length: 255 }),
    county: varchar('county', { length: 255 }),
    state: varchar('state', { length: 255 }),
    country: varchar('country', { length: 255 }),
    zipcode: varchar('zipcode', { length: 255 }),

    mailAddress: varchar('mail_address', { length: 255 }),
    mailApartment: varchar('mail_apartment', { length: 255 }),
    mailCity: varchar('mail_city', { length: 255 }),
    mailState: varchar('mail_state', { length: 255 }),
    mailCounty: varchar('mail_county', { length: 255 }),
    mailCountry: varchar('mail_country', { length: 255 }),
    mailZipcode: varchar('mail_zipcode', { length: 255 }),

    dob: date('dob', {
      mode: 'date',
    }),
    isMinor: boolean('is_minor').default(false),
    gender: varchar('gender', { length: 255 }),

    tracking_params: json('tracking_params'),

    paymentProvider: varchar('payment_provider', { length: 255 }),
    paymentProviderCustomerId: varchar('payment_provider_customer_id', {
      length: 255,
    }),

    ghlContactId: varchar('ghl_contact_id', { length: 255 }),

    timezone: varchar('timezone', { length: 255 }).default('CST'),

    // Stores array of codes: ["PATIENT_REPLIED", "REFUND_PENDING", "PROVIDER_REQUESTED"]
    labels: text('labels').array().default([]),

    driverLicense: varchar('driver_license', { length: 255 }),

    referralCode: text('referral_code').unique(), // "JOHN-42"
    referredByPatientId: integer('referred_by_patient_id'), // Who invited me?

    isReferralActive: boolean('is_referral_active').default(true), // Kill switch for spam
    referralBonusAmount: decimal('referral_bonus_amount', {
      precision: 10,
      scale: 2,
    }), // VIP override ($10.00)

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    referralCodeIdx: uniqueIndex('referral_code_idx').on(t.referralCode),
    patientsCodeIdx: index('patients_code_idx').on(t.code),
    patientsBrandCodeIdx: index('patients_brand_code_idx').on(t.brandCode),
    patientsFullNameSearchIndex: index('patients_full_name_search_index').using(
      'gin',
      sql`to_tsvector('english', ${t.firstName} || ' ' || ${t.lastName})`
    ),
    patientsFirstNameSearchIndex: index(
      'patients_first_name_search_index'
    ).using('gin', sql`to_tsvector('english', ${t.firstName})`),
    patientsLastNameSearchIndex: index('patients_last_name_search_index').using(
      'gin',
      sql`to_tsvector('english', ${t.lastName})`
    ),
    patientsEmailSearchIndex: index('patients_email_search_index').using(
      'gin',
      sql`to_tsvector('english', ${t.email})`
    ),
    patientsPhoneSearchIndex: index('patients_phone_search_index').using(
      'gin',
      sql`to_tsvector('english', ${t.phone})`
    ),
    patientsStateSearchIndex: index('patients_state_search_index').on(t.state),
    patientsLabelsIdx: index('patients_labels_idx').on(t.labels),
  })
)

export type PatientStateInterestType = InferInsertModel<
  typeof patientStateInterests
>

export const patientStateInterests = pgTable(
  'patient_state_interests',
  {
    id: serial('id').primaryKey(),

    brandCode: varchar('brand_code', { length: 255 }).default('parkingmd'),

    patientId: integer('patient_id').notNull(),

    state: varchar('state', { length: 255 }),

    message: text('message'), // Used to store the response of the intake form

    createdAt: timestamp('created_at').defaultNow(),

    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => ({
    patientIdIdx: index('psi_patient_id_idx').on(t.patientId), // Renamed index
    stateIdx: index('state_idx').on(t.state),
    patientStateUnique: uniqueIndex('patient_state_unique_idx').on(
      t.patientId,
      t.state
    ),
  })
)

// like create full text index  or else it will be regular index
export const patientSubscriptions = pgTable(
  'patient_subscriptions',
  {
    id: serial('id').primaryKey(),
    subscriptionId: uuid('subscription_id').default(sql`gen_random_uuid()`), // or "uuid_generate_v4()" if your DB uses that
    patientId: integer('patient_id').references(() => patients.id),

    state: varchar('state', { length: 255 }),

    productId: integer('product_id').notNull(),
    status: varchar('status', { length: 255 }),

    paymentProvider: varchar('payment_provider', { length: 255 }).default(
      'stripe'
    ),
    paymentProviderCustomerId: varchar('payment_provider_customer_id', {
      length: 255,
    }),

    renewalDate: timestamp('renewal_date', {
      mode: 'date',
    }),
    startDate: timestamp('start_date', {
      mode: 'date',
    }),
    endDate: timestamp('end_date', {
      mode: 'date',
    }),
    cancelledAt: timestamp('cancelled_at'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    patientIdIdx: index('patient_id_idx').on(t.patientId),
    productIdIdx: index('product_id_idx').on(t.productId),
    subsId: index('subs_id').on(t.subscriptionId),
  })
)

export const patientIntakeForms = pgTable(
  'patient_intake_forms',
  {
    id: serial('id').primaryKey(),
    brandCode: varchar('brand_code', { length: 255 }).default('parkingmd'),
    patientId: integer('patient_id').notNull(),
    taskId: integer('task_id').notNull(),
    state: varchar('state', { length: 255 }),
    formId: varchar('form_id', { length: 50 }).notNull(),
    response: json('response'), // Used to store the response of the intake form
    type: varchar('type', { length: 255 }), // Used to render the intake form
    tag: varchar('tag', { length: 255 }),
    document_id: integer('document_id'), // Used to store the document ID of the intake form

    intakeText: text('intake_text'),

    lastStep: varchar('last_step', { length: 50 }),
    status: varchar('status', { length: 255 }),

    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => ({
    lastStepIdx: index('patient_intake_forms_last_step_idx').on(t.lastStep),
    patientIdIdx: index('patient_intake_forms_patient_id_idx').on(t.patientId),
    taskIdIdx: index('patient_intake_forms_task_id_idx').on(t.taskId),
    stateIdx: index('patient_intake_forms_state_idx').on(t.state),
    formIdIdx: index('patient_intake_forms_form_id_idx').on(t.formId),
    typeIdx: index('patient_intake_forms_type_idx').on(t.type),
    tagIdx: index('patient_intake_forms_tag_idx').on(t.tag),
    statusIdx: index('patient_intake_forms_status_idx').on(t.status),
    completedAtIdx: index('patient_intake_forms_completed_at_idx').on(
      t.completedAt
    ),
  })
)

// Password Reset Tokens Table
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: varchar('id', { length: 40 }).primaryKey(),
    userId: varchar('user_id', { length: 21 }).notNull(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
  },
  (t) => ({
    userIdx: index('password_token_user_idx').on(t.userId),
    expiresAtIdx: index('password_token_expires_at_idx').on(t.expiresAt),
  })
)

export const workflowConfigs = pgTable('workflow_configs', {
  id: serial('id').primaryKey(),
  workflowId: varchar('workflow_id', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})
export const triageStatusEnum = pgEnum('triage_status', [
  'none',
  'patient_action',
  'provider_action',
  'admin_action',
])
// Tasks Table
export const Tasks = pgTable(
  'tasks',
  {
    id: serial('id').primaryKey(),
    brandCode: varchar('brand_code', { length: 255 }).default('parkingmd'), //index
    code: varchar('code', { length: 255 }), //index

    doctorId: integer('doctor_id').references(() => Doctors.id),
    patientId: integer('patient_id').references(() => patients.id),

    type: varchar('type', { length: 255 }).notNull(), //Appointment
    tag: varchar('tag', { length: 255 }).notNull(), //New
    state: varchar('state', { length: 255 }), //patient state

    status: varchar('status', { length: 255 }).notNull(), //Waiting to start

    callStatus: varchar('call_status', { length: 255 }), //index
    callNote: text('call_note'),
    callBackAt: timestamp('call_back_at'),

    adminNote: text('admin_note'),
    patientNote: text('patient_note'),

    paymentReason: text('payment_reason'),
    startDate: timestamp('start_date'), //index
    dueDate: timestamp('due_date'), //index
    completedDate: timestamp('completed_date'), //index
    approvedDate: timestamp('approved_date'), //index
    paymentDate: timestamp('payment_date'), //index
    validTill: timestamp('valid_till', { mode: 'date' }), //index
    amount: real('amount'),
    isAssigned: boolean('is_assigned').default(false),
    isProviderPriority: boolean('is_provider_priority').default(false),
    providerIsReviewed: boolean('provider_is_reviewed').default(false),
    isReviewed: boolean('is_reviewed').default(false),
    requiresAppointment: boolean('requires_appointment').default(true),

    isPayment: boolean('is_payment'),
    paymentStatus: varchar('payment_Status', { length: 255 })
      .notNull()
      .default('Unpaid'), //index
    paymentProvider: varchar('payment_provider', { length: 255 }).default(
      'stripe'
    ),

    readyForPackaging: boolean('ready_for_packaging').default(false),
    requiresPostProcessing: boolean('requires_post_processing').default(false),
    completedPostProcessingAt: timestamp('completed_post_processing_at', {
      withTimezone: false,
    }),

    totalAmount: real('total_amount'),
    supportAmount: real('support_amount'),
    othersAmount: real('others_amount'),
    processingAmount: real('processing_amount'),
    sscAmount: real('ssc_amount'),
    providerAmount: real('provider_amount'),
    discountAmount: real('discount_amount'),
    discountCode: varchar('discount_code', { length: 255 }),
    refundReason: text('refund_reason'),
    refundNotes: text('refund_notes'),
    refundAmount: real('refund_amount'),
    refundAt: timestamp('refund_at'),
    refundBy: integer('refund_by'),

    paymentProviderTransactionId: varchar('payment_provider_transaction_id', {
      length: 255,
    }),
    paymentProviderSubscriptionId: varchar('payment_provider_subscription_id', {
      length: 255,
    }),

    patientSubscriptionId: integer('patient_subscription_id'),

    tracking_params: json('tracking_params'),

    formResponse: json('form_response'),

    // cal com
    calComUrl: varchar('cal_com_url', { length: 255 }),
    calBookingUid: varchar('cal_booking_uid', { length: 255 }),
    bookingId: integer('booking_id'),
    bookingTriggerEvent: varchar('booking_trigger_event', { length: 255 }),
    bookingCreatedAt: timestamp('booking_created_at'),
    // Timings
    bookingStartTime: timestamp('booking_start_time'),
    bookingEndTime: timestamp('booking_end_time'),
    // Organizer
    organizerName: varchar('organizer_name', { length: 255 }),
    organizerEmail: varchar('organizer_email', { length: 255 }),
    // Additional info from 'payload' you frequently need
    bookingStatus: varchar('booking_status', { length: 255 }),
    bookingReason: text('booking_reason'),
    rescheduleReason: text('reschedule_reason'),
    cancellationReason: text('cancellation_reason'),
    cancelledBy: varchar('cancelled_by', { length: 255 }),
    rescheduledBy: varchar('rescheduled_by', { length: 255 }),
    cancelledAt: timestamp('cancelled_at'),
    rescheduledAt: timestamp('rescheduled_at'),
    // The rest in a JSON column for good measure
    calAttendees: json('cal_attendees'),
    calBookingPayload: json('cal_booking_payload'),

    // isSubscription: boolean("is_subscription").default(false),
    // subscriptionMethod: varchar("subscription_method", { length: 255 }),
    patientNoteSendAt: timestamp('patient_note_send_at'),

    assignedAt: timestamp('assigned_at'),

    // Stores array of codes: ["PATIENT_REPLIED", "REFUND_PENDING", "PROVIDER_REQUESTED"]
    labels: text('labels').array().default([]),

    // 2. AI Assessment Data
    // Stores: { status: 'eligible', summary: '...', checks: { medical: 'pass', id: 'fail' } }
    aiAgentAssessment: jsonb('ai_agent_assessment'),
    aiAgentAssessmentGeneratedAt: timestamp('ai_agent_assessment_generated_at'),
    // aiMedicalAnalysisStatus: varchar("ai_analysis_status", { length: 255 }).default("pending"),

    // 3. Hold Logic
    holdAt: timestamp('hold_at'),
    holdReason: text('hold_reason'),

    // 4. Review Tracking
    reviewedAt: timestamp('reviewed_at'), // Used to filter "Done" items
    reviewedBy: integer('reviewed_by').references(() => users.id),

    // 5. Followup Tracking
    followupSentCount: integer('followup_sent_count'),
    lastFollowupSentAt: timestamp('last_followup_sent_at'),
    lastFollowupResolvedAt: timestamp('last_followup_resolved_at'),

    providerDeclineReason: text('provider_decline_reason'),
    providerDeclineNotes: text('provider_decline_notes'),

    providerApprovalReason: text('provider_approval_reason'),
    providerApprovalNotes: text('provider_approval_notes'),

    providerVisitNote: text('provider_visit_note'),
    // AI analysis
    adminDeclineReason: text('admin_decline_reason'),
    adminDeclineNotes: text('admin_decline_notes'),
    providerAIFeedbackReason: text('provider_ai_feedback_reason'),
    providerAIFeedbackNotes: text('provider_ai_feedback_notes'),
    aiMedicalAnalysisIsProcessing: boolean('ai_medical_analysis_is_processing'),
    aiMedicalAnalysisResult: text('ai_medical_analysis_result'),
    aiMedicalAnalysisFailReason: text('ai_medical_analysis_fail_reason'),
    aiMedicalAnalysisGeneratedAt: timestamp('ai_medical_analysis_generated_at'),
    aiMedicalAnalysisStatus: varchar('ai_medical_analysis_status', {
      length: 255,
    }).default('pending'),

    // The Single Source of Truth for operational state
    triageStatus: triageStatusEnum('triage_status').default('none').notNull(),

    triageRead: boolean('triage_read').default(false),
    // Used for FIFO sorting (Oldest unread first). Updates on ANY action.
    triageUpdatedAt: timestamp('triage_updated_at').defaultNow().notNull(),

    // Audit: When was it cleared?
    triageReadAt: timestamp('triage_read_at'),

    // Audit: Who cleared it?
    // Note: Add .references(() => users.id) if you want strict foreign key constraints
    triageReadBy: integer('triage_read_by'),

    // Context: Internal sticky notes
    triageNote: text('triage_note'),

    isTemporary: boolean('is_temporary').default(false),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    taskIdIdx: index('task_user_idx').on(t.id),
    codeIdx: index('task_code_idx').on(t.code),
    typeIdx: index('task_type_idx').on(t.type),
    tagIdx: index('task_tag_idx').on(t.tag),
    stateIdx: index('task_state_idx').on(t.state),
    statusIdx: index('task_status_idx').on(t.status),
    callStatusIdx: index('task_call_status_idx').on(t.callStatus),
    startDateIdx: index('task_start_date_idx').on(t.startDate),
    dueDateIdx: index('task_due_date_idx').on(t.dueDate),
    completedDateIdx: index('task_completed_date_idx').on(t.completedDate),
    paymentStatusIdx: index('task_payment_status_idx').on(t.paymentStatus),
    isAssignedIdx: index('task_is_assigned_idx').on(t.isAssigned),
    isPaymentIdx: index('task_is_payment_idx').on(t.isPayment),
    labelsIdx: index('task_labels_idx').on(t.labels),
    aiAgentAssessmentIdx: index('task_ai_agent_assessment_idx').on(
      t.aiAgentAssessment
    ),
    aiAgentAssessmentGeneratedAtIdx: index(
      'task_ai_agent_assessment_generated_at_idx'
    ).on(t.aiAgentAssessmentGeneratedAt),
    holdAtIdx: index('task_hold_at_idx').on(t.holdAt),
    reviewedAtIdx: index('task_reviewed_at_idx').on(t.reviewedAt),
    reviewedByIdx: index('task_reviewed_by_idx').on(t.reviewedBy),
    followupSentCountIdx: index('task_followup_sent_count_idx').on(
      t.followupSentCount
    ),
    lastFollowupSentAtIdx: index('task_last_followup_sent_at_idx').on(
      t.lastFollowupSentAt
    ),
    lastFollowupResolvedAtIdx: index('task_last_followup_resolved_at_idx').on(
      t.lastFollowupResolvedAt
    ),
  })
)

export const followups = pgTable(
  'followups',
  {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id')
      .notNull()
      .references(() => patients.id),
    taskId: integer('task_id').references(() => Tasks.id), // Nullable (can exist independent of task)

    // Types: 'medical_record', 'id_proof', 'information', 'action'
    type: varchar('type', { length: 50 }).notNull(),
    portalRoute: varchar('portal_route', { length: 255 }),

    // Status: 'pending', 'resolved'
    status: varchar('status', { length: 50 }).default('pending'),

    message: text('message'), // The specific request

    // Labels to be added to the task (array of label names)
    labels: text('labels').array().default([]),

    // Task status to be updated (if provided)
    taskStatus: varchar('task_status', { length: 255 }),

    patientResponse: text('patient_response'),
    showPortal: boolean('show_portal').default(true),

    isSendEmail: boolean('is_send_email').default(false),
    sendEmailAt: timestamp('send_email_at'),
    isSendSMS: boolean('is_send_sms').default(false),
    sendSMSAt: timestamp('send_sms_at'),

    // Audit
    createdBy: integer('created_by').references(() => users.id),
    createdAs: varchar('created_as', { length: 20 }), // 'admin' | 'provider'

    // Resolution
    resolvedAt: timestamp('resolved_at'),
    resolvedBy: integer('resolved_by').references(() => users.id), // Null if resolved by patient action

    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    patientIdIdx: index('followups_patient_id_idx').on(t.patientId),
    taskIdIdx: index('followups_task_id_idx').on(t.taskId),
    typeIdx: index('followups_type_idx').on(t.type),
    statusIdx: index('followups_status_idx').on(t.status),
    createdByIdx: index('followups_created_by_idx').on(t.createdBy),
    resolvedByIdx: index('followups_resolved_by_idx').on(t.resolvedBy),
  })
)

// Follow-up Notification Jobs - For tracking bulk follow-up job processing
// This is separate from followups table - this is for job queue management, debugging, and retry
export const followupNotificationJobs = pgTable(
  'followup_notification_jobs',
  {
    id: serial('id').primaryKey(),

    // Batch grouping - all jobs from one bulk action share the same batchId
    batchId: uuid('batch_id').notNull(),

    // References
    taskId: integer('task_id').references(() => Tasks.id),
    patientId: integer('patient_id')
      .notNull()
      .references(() => patients.id),
    followupId: integer('followup_id').references(() => followups.id), // Created after processing

    // Job status: 'queued', 'processing', 'completed', 'failed'
    status: varchar('status', { length: 50 }).default('queued').notNull(),

    // Message & options (stored for retry capability)
    message: text('message').notNull(),
    labels: text('labels').array().default([]),
    taskStatus: varchar('task_status', { length: 255 }),
    isSendEmail: boolean('is_send_email').default(false),
    isSendSMS: boolean('is_send_sms').default(false),
    showPortal: boolean('show_portal').default(true),
    resolvePastFollowups: boolean('resolve_past_followups').default(false),

    // Results
    emailSent: boolean('email_sent').default(false),
    smsSent: boolean('sms_sent').default(false),
    errorMessage: text('error_message'),

    // Retry tracking
    retryCount: integer('retry_count').default(0),
    maxRetries: integer('max_retries').default(3),

    // Audit
    createdBy: integer('created_by').references(() => users.id),
    createdAs: varchar('created_as', { length: 20 }), // 'admin' | 'provider'
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    batchIdIdx: index('followup_jobs_batch_id_idx').on(t.batchId),
    statusIdx: index('followup_jobs_status_idx').on(t.status),
    taskIdIdx: index('followup_jobs_task_id_idx').on(t.taskId),
    patientIdIdx: index('followup_jobs_patient_id_idx').on(t.patientId),
    createdAtIdx: index('followup_jobs_created_at_idx').on(t.createdAt),
  })
)

// export type FollowupNotificationJob = typeof followupNotificationJobs.$inferSelect;
// export type NewFollowupNotificationJob = typeof followupNotificationJobs.$inferInsert;

// ai_jobs
// ---
// id

// purpose

// task_id (nullable)
// patient_id (nullable)
// document_id (nullable)

// status (pending, processing, completed, failed)

// prompt
// response

// fail_reason

// ai_model
// input_tokens
// output_tokens
// cache_write_tokens
// cache_read_tokens

// executed_at
// executed_as (system, manual)
// executed_by

// notes

// created_at

export const aiJobs = pgTable(
  'ai_jobs',
  {
    id: serial('id').primaryKey(),
    purpose: varchar('purpose', { length: 255 }),
    taskId: integer('task_id').references(() => Tasks.id),
    patientId: integer('patient_id').references(() => patients.id),
    documentId: integer('document_id').references(() => Documents.id),
    status: varchar('status', { length: 255 }).default('pending'),
    prompt: text('prompt'),
    response: text('response'),
    failReason: text('fail_reason'),
    aiModel: varchar('ai_model', { length: 255 }),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    cacheWriteTokens: integer('cache_write_tokens'),
    cacheReadTokens: integer('cache_read_tokens'),
    executedAt: timestamp('executed_at'),
    executedAs: varchar('executed_as', { length: 255 }),
    executedBy: integer('executed_by').references(() => users.id),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    taskIdIdx: index('ai_jobs_task_id_idx').on(t.taskId),
    patientIdIdx: index('ai_jobs_patient_id_idx').on(t.patientId),
    documentIdIdx: index('ai_jobs_document_id_idx').on(t.documentId),
    statusIdx: index('ai_jobs_status_idx').on(t.status),
    executedAtIdx: index('ai_jobs_executed_at_idx').on(t.executedAt),
    executedAsIdx: index('ai_jobs_executed_as_idx').on(t.executedAs),
    executedByIdx: index('ai_jobs_executed_by_idx').on(t.executedBy),
    purposeIdx: index('ai_jobs_purpose_idx').on(t.purpose),
  })
)

export const appointments = pgTable(
  'appointments',
  {
    id: serial('id').primaryKey(),
    taskId: integer('task_id')
      .notNull()
      .references(() => Tasks.id, { onDelete: 'cascade' }),

    // Duplicated for direct appointment queries (denormalization for performance)
    patientId: integer('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    doctorId: integer('doctor_id').references(() => Doctors.id, {
      onDelete: 'set null',
    }),
    // categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),

    // Appointment-specific fields
    startAt: timestamp('start_at', { withTimezone: false }).notNull(), // UTC timestamp
    endAt: timestamp('end_at', { withTimezone: false }).notNull(), // UTC timestamp
    // status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
    status: text('status').notNull().default('scheduled'),
    link: text('link'), // appointment_link

    createdAt: timestamp('created_at', { withTimezone: false })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // 1. ⚡ NEW: Composite Index for Availability Checks
    // Essential for getDoctorAppointmentCount (where doctorId = ? AND startAt > ?)
    doctorSlotIdx: index('appointments_doctor_slot_idx').on(
      t.doctorId,
      t.startAt
    ),

    // 2. ⚡ NEW: Task Status Index
    // Essential for cancelLatestAppointmentForTask
    taskStatusIdx: index('appointments_task_status_idx').on(t.taskId, t.status),
  })
)

// Messages Table
export const Messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  message: text('message').notNull(),
  senderId: integer('sender_id').notNull(),
  senderType: varchar('sender_type', { length: 255 }).notNull(),
  receiverId: integer('receiver_id').notNull(),
  receiverType: varchar('receiver_type', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
    () => new Date()
  ),
})

export const templates = pgTable(
  'templates',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    html: varchar('html', {
      length: 65535,
    }),
    editorState: varchar('editor_state', { length: 65535 }),
    state: varchar('state', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    templatesNameIdIdx: index('templates_name_idx').on(t.name),
  })
)

export const templateContents = pgTable('template_contents', {
  id: serial('id').primaryKey(),
  templateType: varchar('template_type', { length: 255 }).default('visit'),
  followupType: varchar('followup_type', { length: 255 }),
  portalRoute: varchar('portal_route', { length: 255 }),
  templateName: varchar('template_name', { length: 255 }).notNull(),
  templateState: varchar('template_state', { length: 255 }),
  isSendEmail: boolean('is_send_email').default(false),
  isSendSMS: boolean('is_send_sms').default(false),
  isDefaultSelected: boolean('is_default_selected').default(false),
  content: text('content'),
  doctorId: integer('doctor_id'),
  labels: text('labels').array().default([]),
  taskStatus: varchar('task_status', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
    () => new Date()
  ),
})

export const agreementDocuments = pgTable('agreement_documents', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(), // Unique identifier for the document type
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(), // Rich text content from Lexical editor
  editorState: text('editor_state'), // Lexical editor state JSON
  status: documentStatusEnum('status').default('draft'),
  macros: json('macros').$type<string[]>(), // Array of macro keys used in this document
  predefinedMacros: json('predefined_macros').$type<Record<string, string>>(), // Macros that cannot be changed
  allowCustomMacros: boolean('allow_custom_macros').default(true), // Whether custom macros are allowed
  brandCode: varchar('brand_code', { length: 255 }).default('parkingmd'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
})

// Generated Documents (tracking what was generated for patients)
export const generatedAgreementDocuments = pgTable(
  'generated_agreement_documents',
  {
    id: serial('id').primaryKey(),
    agreementDocumentId: integer('agreement_document_id').references(
      () => agreementDocuments.id
    ),
    patientId: integer('patient_id').references(() => patients.id),
    documentId: integer('document_id').references(() => Documents.id), // Links to existing Documents table
    macroValues: json('macro_values').$type<Record<string, string>>(), // The actual macro values used
    generatedAt: timestamp('generated_at').defaultNow(),
    signedAt: timestamp('signed_at'),
    isForced: boolean('is_forced').default(false), // Whether this was force generated
  }
)

// Types
export type AgreementDocument = typeof agreementDocuments.$inferSelect
export type NewAgreementDocument = typeof agreementDocuments.$inferInsert
export type GeneratedAgreementDocument =
  typeof generatedAgreementDocuments.$inferSelect

// Documents Table
export const Documents = pgTable(
  'documents',
  {
    id: serial('id').primaryKey(),

    brandCode: varchar('brand_code', { length: 255 }).default('parkingmd'), //index
    code: varchar('code', { length: 255 }), //index

    doctorId: integer('doctor_id').references(() => Doctors.id),
    patientId: integer('patient_id').references(() => patients.id),
    taskId: integer('task_id').references(() => Tasks.id),

    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    subType: varchar('sub_type', { length: 255 }), // e.g., "Permanent Permit", "Temporary Permit"
    tag: varchar('tag', { length: 255 }),
    url: varchar('url', { length: 255 }).notNull(),
    fileType: varchar('file_type', { length: 255 }).notNull(),
    patientVisible: boolean('patient_visible').default(true),
    readyForPackaging: boolean('ready_for_packaging').default(false),

    validTill: timestamp('valid_till', { mode: 'date' }),
    storageType: varchar('storage_type', { length: 255 }).default('local'), // local or gcs

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    documentIdIdx: index('document_id_idx').on(t.id),
    codeIdx: index('document_code_idx').on(t.code),
    typeIdx: index('document_type_idx').on(t.type),
    subTypeIdx: index('document_sub_type_idx').on(t.subType),
    tagIdx: index('document_tag_idx').on(t.tag),
    fileTypeIdx: index('document_file_type_idx').on(t.fileType),
    patientVisibleIdx: index('document_patient_visible_idx').on(
      t.patientVisible
    ),
    doctorIdIdx: index('document_doctor_id_idx').on(t.doctorId),
    patientIdIdx: index('document_patient_id_idx').on(t.patientId),
    validTillIdx: index('document_valid_till_idx').on(t.validTill),
    nameIdx: index('document_name_idx').using(
      'gin',
      sql`to_tsvector('english', ${t.name})`
    ),
  })
)

// Transactions Table
export const Transactions = pgTable(
  'transactions',
  {
    id: serial('id').primaryKey(),
    taskId: integer('task_id').references(() => Tasks.id),
    patientId: integer('patient_id').references(() => patients.id),
    doctorId: integer('doctor_id')
      .notNull()
      .references(() => Doctors.id),
    amount: real('amount'),
    totalAmount: real('total_amount').notNull(),
    patientAmount: real('patient_amount').notNull(),
    supportAmount: real('support_amount').notNull(),
    othersAmount: real('others_amount').notNull(),
    processingAmount: real('processing_amount').notNull(),
    sscAmount: real('ssc_amount').notNull(),
    providerAmount: real('provider_amount').notNull(),
    status: varchar('status', { length: 255 }).notNull(), //index
    paymentCode: varchar('payment_code', { length: 255 }), //index
    adminNotes: varchar('admin_notes', {
      length: 65535,
    }), //index
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    doctorIdIdx: index('transaction_doctor_id_idx').on(t.doctorId),
    statusIdx: index('transaction_status_idx').on(t.status),
    paymentCodeIdx: index('transaction_payment_code_idx').on(t.paymentCode),
  })
)

// DoctorPayments Table
export const DoctorPayments = pgTable(
  'doctor_payments',
  {
    id: serial('id').primaryKey(),
    paymentCode: varchar('payment_code', { length: 255 }).notNull(),
    doctorId: integer('doctor_id')
      .notNull()
      .references(() => Doctors.id),
    paymentDate: timestamp('payment_date').notNull(),
    paymentAmount: real('payment_amount').notNull(),
    paymentMethod: json('payment_method'),
    status: varchar('status', { length: 255 }).notNull(),
    paymentRefNumber: varchar('payment_ref_number', { length: 255 }),
    adminNotes: text('admin_notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    doctorIdIdx: index('doctor_payment_doctor_id_idx').on(t.doctorId),
    statusIdx: index('doctor_payment_status_idx').on(t.status),
    paymentCodeIdx: index('doctor_payment_payment_code_idx').on(t.paymentCode),
  })
)

export const activeCallSessions = pgTable('active_call_sessions', {
  id: serial('id').primaryKey(),
  callSid: varchar('call_sid', { length: 34 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull(), // 'waiting', 'accepted', 'completed'
  from: varchar('from', { length: 20 }).notNull(),
  to: varchar('to', { length: 20 }).notNull(),
  handledBy: varchar('handled_by', { length: 50 }), // admin's ID who accepted
  startedAt: timestamp('started_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
})

export const DoctorPriorities = pgTable(
  'doctor_priorities',
  {
    id: serial('id').primaryKey(),
    doctorId: integer('doctor_id')
      .notNull()
      .references(() => Doctors.id),
    state: varchar('state', { length: 255 }).notNull(),
    maxTasksCap: integer('max_tasks_cap'),
    priority: numeric('priority', { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
    createdBy: integer('created_by').references(() => users.id),
  },
  (t) => ({
    doctorStateIdx: uniqueIndex('doctor_state_priority_idx').on(
      t.doctorId,
      t.state
    ),
    statePriorityIdx: index('doctor_priorities_state_sort_idx').on(
      t.state,
      t.priority
    ),
  })
)

// Doctors Table
export const Doctors = pgTable(
  'doctors',
  {
    id: integer('id').primaryKey().notNull(),
    firstName: varchar('first_name', { length: 255 }).notNull(),
    middleName: varchar('middle_name', { length: 255 }),
    lastName: varchar('last_name', { length: 255 }).notNull(),
    code: varchar('code', { length: 255 }),
    profilePicture: varchar('profile_picture', { length: 255 }),
    birthDate: timestamp('birth_date'),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    phoneNumber: varchar('phone_number', { length: 255 }).notNull(),
    maxTasksCap: integer('max_tasks_cap'),
    services: text('services'),
    bio: text('bio'),
    country: varchar('country', { length: 255 }),
    address: varchar('address', { length: 255 }),
    city: varchar('city', { length: 255 }),
    county: varchar('county', { length: 255 }),
    state: varchar('state', { length: 255 }),
    zipCode: varchar('zip_code', { length: 255 }),
    npiNumber: varchar('npi_number', { length: 255 }),
    title: varchar('title', { length: 255 }),
    medicalLicense: json('medical_license'),
    practiceInformation: json('practice_information'),
    businessHours: json('business_hours'),
    signature: varchar('signature', { length: 255 }),
    credentials: varchar('credentials', { length: 255 }), //roles like Physician, Nurse Practitioner, etc.
    accountNumber: varchar('account_number', { length: 255 }),
    routingNumber: varchar('routing_number', { length: 255 }),
    officeFaxNumber: varchar('office_fax_number', { length: 255 }),
    sendEmailNotification: boolean('send_email_notification').default(true),
    emailNotification: varchar('email_notification', { length: 255 }),
    sendSmsNotification: boolean('send_sms_notification').default(true),
    phoneNumberNotification: varchar('phone_number_notification', {
      length: 255,
    }),
    formAddress: json('form_address'),
    isReturnMailAddressRequired: boolean(
      'is_return_mail_address_required'
    ).default(false),
    returnMailAddress: jsonb('return_mail_address'),
    timezone: text('timezone').notNull(), // e.g., "America/New_York"
    appointmentLink: text('appointment_link'),
    isFlatAmount: boolean('is_flat_amount').default(false),
    flatAmount: numeric('flat_amount', { precision: 10, scale: 2 }),
    isHidePaymentPage: boolean('is_hide_payment_page').default(false),
    isActive: boolean('is_active').default(true),
    isOnline: boolean('is_online').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),

    patientCallMediums: jsonb('patient_call_mediums'), // [{brand: 'leafy', key: 'doxy', link: 'https://doxy.me/me', enabled: 1}, {brand: 'leafy', key: 'call', link: '+1234567890', enabled: 1}]
  },
  (t) => ({
    codeIdx: index('doctor_code_idx').on(t.code),
    uniqueUserId: uniqueIndex('unique_doctor_user_id').on(t.userId, t.id),
    firstNameSearchIndex: index('first_name_search_index').using(
      'gin',
      sql`to_tsvector('english', ${t.firstName})`
    ),
    lastNameSearchIndex: index('last_name_search_index').using(
      'gin',
      sql`to_tsvector('english', ${t.lastName})`
    ),
    cityIdx: index('doctor_city_idx').on(t.city),
    stateIdx: index('doctor_state_idx').on(t.state),
    countryIdx: index('doctor_country_idx').on(t.country),
  })
)

export const doctorEmployees = pgTable(
  'doctor_employees',
  {
    id: serial('id').primaryKey(),
    doctorId: integer('doctor_id')
      .notNull()
      .references(() => users.id),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    doctorIdIdx: index('doctor_employee_doctor_id_idx').on(t.doctorId),
    employeeIdIdx: index('doctor_employee_employee_id_idx').on(t.employeeId),
  })
)

//Doctor Medical license
export const DoctorMedicalLicense = pgTable(
  'doctor_medical_license',
  {
    id: serial('id').primaryKey(),
    doctorId: integer('doctor_id')
      .notNull()
      .references(() => users.id),
    country: varchar('country', { length: 255 }),
    state: varchar('state', { length: 255 }),
    licenseNumber: varchar('license_number', { length: 255 }),
    licenseExpirationDate: timestamp('license_expiration_date'),
    licenseEntity: varchar('license_entity', { length: 255 }),
    stateLicenseLookupLink: text('state_license_lookup_link'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  }
  // (t) => ({
  //   doctorMedicalLicenseIdIdx: index("doctor_medical_license_doctor_id_idx").on(t.doctorId),
  // })
)

//Doctor Business Hours
export const DoctorBusinessHours = pgTable(
  'doctor_business_hours',
  {
    id: serial('id').primaryKey(),
    doctorId: integer('doctor_id')
      .notNull()
      .references(() => users.id),
    day: varchar('day', { length: 255 }),
    startTime: varchar('start_time', { length: 255 }),
    endTime: varchar('end_time', { length: 255 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  }
  // (t) => ({
  //   doctorBusinessHoursIdIdx: index("doctor_business_hours_doctor_id_idx").on(t.doctorId),
  // })
)

export const doctorTimeOff = pgTable(
  'doctor_time_off',
  {
    id: serial('id').primaryKey(),
    doctorId: integer('doctor_id')
      .notNull()
      .references(() => Doctors.id, { onDelete: 'cascade' }),
    startDateTime: timestamp('start_date_time', {
      withTimezone: false,
    }).notNull(), // UTC timestamp
    endDateTime: timestamp('end_date_time', { withTimezone: false }).notNull(), // UTC timestamp
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: false })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // 5. ⚡ NEW: Future Time-Off Lookup
    // Essential for filtering "Active" time offs in the loop
    doctorFutureTimeOffIdx: index('doctor_time_off_lookup_idx').on(
      t.doctorId,
      t.startDateTime
    ),
  })
)

//Address For Forms
export const AddressForForms = pgTable(
  'address_for_forms',
  {
    id: serial('id').primaryKey(),
    doctorId: integer('doctor_id')
      .notNull()
      .references(() => users.id),
    service: varchar('service', { length: 255 }),
    country: varchar('country', { length: 255 }),
    state: varchar('state', { length: 255 }),
    address: varchar('address', { length: 255 }),
    county: varchar('county', { length: 255 }),
    city: varchar('city', { length: 255 }),
    zipcode: varchar('zipcode', { length: 255 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 255 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    doctorIdIdx: index('doctor_medical_license_doctor_id_idx').on(t.doctorId),
  })
)

// Admins Table
export const Admins = pgTable(
  'admins',
  {
    id: integer('id').primaryKey().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phoneNumber: varchar('phone_number', { length: 255 }),
    profilePicture: varchar('profile_picture', { length: 255 }),
    userId: integer('user_id').references(() => users.id),
    role: varchar('role', { length: 255 }).notNull(),
    isActive: boolean('is_active').default(true),
    companyCost: numeric('company_cost', { precision: 10, scale: 2 }).default(
      '0'
    ),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    uniqueUserId: uniqueIndex('unique_user_id').on(t.userId, t.id),
    uniqueEmail: uniqueIndex('unique_email').on(t.email),
    // uniquePhoneNumber: uniqueIndex("unique_phone_number").on(t.phoneNumber),
    nameIdx: index('name_idx').using(
      'gin',
      sql`to_tsvector('english', ${t.name})`
    ),
  })
)

// Comments Table
export const Comments = pgTable(
  'comments',
  {
    id: serial('id').primaryKey(),
    content: text('content').notNull(),
    userType: roleEnum('role'),
    userId: integer('user_id').notNull(),
    commentableType: varchar('commentable_type', { length: 255 }).notNull(),
    commentableId: varchar('commentable_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    commentsUserIdIdx: index('comments_user_id_idx').on(t.userId),
    commentableIdIdx: index('comments_commentable_id_idx').on(t.commentableId),
    commentableTypeIdx: index('comments_commentable_type_idx').on(
      t.commentableType
    ),
    commentsUserTypeIdx: index('comments_user_type_idx').on(t.userType),
  })
)

// Notes Table
export const Notes = pgTable(
  'notes',
  {
    id: serial('id').primaryKey(),
    content: text('content').notNull(),
    userType: roleEnum('role'),
    userId: integer('user_id').notNull(),
    isHidden: boolean('is_hidden').default(false),
    patientId: integer('patient_id').references(() => patients.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    userIdIdx: index('patients_id_idx').on(t.userId),
    // patientIdIdx: index("patient_id_idx").on(t.patientId),
    userTypeIdx: index('patient_type_idx').on(t.userType),
    isHiddenIdx: index('patient_is_hidden_idx').on(t.isHidden),
  })
)

export const serviceConfigurations = pgTable(
  'service_configurations',
  {
    id: serial('id').primaryKey(),

    stateCode: varchar('state_code', { length: 5 }), // ISO 2 state code

    type: varchar('type', { length: 255 }), // ISO 2 state code
    tag: varchar('tag', { length: 255 }), // ISO 2 state code

    brandCode: varchar('brand_code', { length: 255 }).default('parkingmd'),

    expiryDays: integer('expiry_days'), // change integer type to date
    calcomLink: varchar('calcom_link'),
    paymentFormId: integer('payment_form_id').references(() => paymentForms.id),
    intakeFormConfiguration: jsonb('intake_form_configuration'), // JSON for intake form configuration

    active: boolean('active').default(false),

    // Post complete instructions State Wise configuration
    postCompleteInstructions: text('post_complete_instructions'),
    postApprovalInstructions: text('post_approval_instructions'),
    taskPostCompleteInstructions: text('task_post_complete_instructions'),

    isApprovalNeeded: boolean('is_approval_needed').default(false),
    requiresPostProcessing: boolean('requires_post_processing').default(false),

    providerSignatureRequired: boolean('provider_signature_required').default(
      false
    ),

    requiresCoverLetter: boolean('requires_coverletter').default(false),
    requiresEnvelope: boolean('requires_envelope').default(false),
    requirePhysicianCredentialsDocument: boolean(
      'require_physician_credentials_document'
    ).default(false),

    coverLetterContent: text('cover_letter_content'),
    coverLetterSubject: text('cover_letter_subject'),

    requiresPrescription: boolean('requires_prescription').default(false),
    requiresPackaging: boolean('requires_packaging').default(false),

    requiresAsyncAppointment: boolean('requires_async_appointment').default(
      false
    ),
    requiresAppointment: boolean('requires_appointment').default(true),

    appointmentDurationMinutes: integer('appointment_duration_minutes').default(
      15
    ),
    appointmentBufferMinutes: integer('appointment_buffer_minutes').default(0),
    appointmentBookingWindowDays: integer(
      'appointment_booking_window_days'
    ).default(14),
    appointmentConcurrencyLimit: integer(
      'appointment_concurrency_limit'
    ).default(10),

    stateLicenseLookupLink: text('state_license_lookup_link'),
    physicianCredentialsContentHtml: text('physician_credentials_content_html'),

    paymentProvider: varchar('payment_provider', { length: 255 }).default(
      'stripe'
    ),

    createdAt: timestamp('created_at', { withTimezone: false }), // Timestamp for creation
    updatedAt: timestamp('updated_at', { withTimezone: false })
      .defaultNow()
      .notNull(), // Timestamp for update
  },
  (t) => ({
    typeIdx: index('type_idx').on(t.type),
    tagIdx: index('tag_idx').on(t.tag),
    stateCodeIdx: index('state_code_idx').on(t.stateCode),
    configLookupIdx: uniqueIndex('service_config_lookup_idx').on(
      t.brandCode,
      t.stateCode,
      t.type,
      t.tag
    ),
  })
)
export type ServiceConfigurations = InferSelectModel<
  typeof serviceConfigurations
>

export const states = pgTable(
  'states',
  {
    id: serial('id').primaryKey(),

    name: varchar('name', { length: 100 }).notNull(), // State name
    iso2: varchar('iso2', { length: 5 }), // ISO 2 state code
    countryCode: varchar('country_code', { length: 2 }), // Country code (ISO2)

    createdAt: timestamp('created_at', { withTimezone: false }), // Timestamp for creation
    updatedAt: timestamp('updated_at', { withTimezone: false })
      .defaultNow()
      .notNull(), // Timestamp for update
  },
  (t) => ({
    nameIdx: index('states_name_idx').on(t.name),
    iso2Idx: index('states_iso2_idx').on(t.iso2),
  })
)

// Document Expiration Configuration Table
export const documentExpirationConfig = pgTable(
  'document_expiration_config',
  {
    id: serial('id').primaryKey(),

    state: varchar('state', { length: 255 }).notNull(), // State code
    type: varchar('type', { length: 255 }).notNull(), // Service type
    subType: varchar('sub_type', { length: 255 }).notNull(), // e.g., "Permanent Permit", "Temporary Permit", etc.
    tag: varchar('tag', { length: 255 }).notNull(), // Service tag

    expiryDays: integer('expiry_days').notNull(), // Number of days until expiration

    brandCode: varchar('brand_code', { length: 255 }).default('parkingmd'),

    createdAt: timestamp('created_at', { withTimezone: false })
      .defaultNow()
      .notNull(), // Timestamp for creation
    updatedAt: timestamp('updated_at', { withTimezone: false })
      .defaultNow()
      .notNull(), // Timestamp for update
  },
  (t) => ({
    stateIdx: index('doc_exp_state_idx').on(t.state),
    typeIdx: index('doc_exp_type_idx').on(t.type),
    subTypeIdx: index('doc_exp_sub_type_idx').on(t.subType),
    tagIdx: index('doc_exp_tag_idx').on(t.tag),
    // Composite index for common lookups
    stateTypeSubTypeTagIdx: uniqueIndex(
      'doc_exp_state_type_subtype_tag_idx'
    ).on(t.state, t.type, t.subType, t.tag),
  })
)

export type DocumentExpirationConfig =
  typeof documentExpirationConfig.$inferSelect
export type NewDocumentExpirationConfig =
  typeof documentExpirationConfig.$inferInsert

// export const states = pgTable("states", {
//   id: serial("id").primaryKey(),

//   name: varchar("name", { length: 100 }).notNull(), // State name
//   iso2: varchar("iso2", { length: 5 }), // ISO 2 state code
//   countryCode: varchar('country_code', { length: 2 }),  // Country code (ISO2)
//   expiryDays: integer("expiry_days"),
//   calcomLink: varchar("calcom_link"),
//   paymentFormId: integer("payment_form_id").references(() => paymentForms.id),
//   active: boolean("active").default(false),

//   createdAt: timestamp("created_at", { withTimezone: false }), // Timestamp for creation
//   updatedAt: timestamp("updated_at", { withTimezone: false })
//     .defaultNow()
//     .notNull(), // Timestamp for update
// },(t) => ({
//   nameIdx: index("states_name_idx").on(t.name),
//   iso2Idx: index("states_iso2_idx").on(t.iso2),
// }));

export const DoctorsServicePrice = pgTable(
  'doctors_service_pricing',
  {
    id: serial('id').primaryKey(), // Primary Key with bigint (auto increment)
    // brandCode: varchar("brand_code", { length: 255 }).default("parkingmd"), // Brand code for the service
    doctorId: bigint('doctor_id', { mode: 'number' })
      .notNull()
      .references(() => Doctors.id), // Foreign key for the doctor

    state: varchar('state', { length: 255 }), // State where the service is offered

    tags: varchar('tags', { length: 255 }),
    type: varchar('type', { length: 255 }), // Type of the service

    price: numeric('price', { precision: 10, scale: 2 }).notNull(), // Price
  },
  (t) => ({
    doctorTagsTypeIdx: index('doctor_tags_type_idx').on(
      t.doctorId,
      t.tags,
      t.type
    ),
  })
)

// ActivityLog Table
export const ActivityLogs = pgTable(
  'activity_logs',
  {
    id: serial('id').primaryKey(),

    // Who performed the action
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    userRole: varchar('user_role', { length: 255 }).notNull(),

    // What action was performed
    action: varchar('action', { length: 255 }).notNull(), // e.g., "created", "updated", "deleted"
    entityType: varchar('entity_type', { length: 255 }).notNull(), // e.g., "task", "document", "patient"
    entityId: varchar('entity_id', { length: 255 }).notNull(), // ID of the affected entity

    // Additional context
    description: text('description').notNull(), // Human-readable description of the action
    oldData: json('old_data'), // Previous state for updates
    newData: json('new_data'), // New state for updates
    metadata: json('metadata'), // Any additional contextual information

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    // Indexes for common query patterns
    userIdIdx: index('activity_log_user_id_idx').on(t.userId),
    userRoleIdx: index('activity_log_user_role_idx').on(t.userRole),
    actionIdx: index('activity_log_action_idx').on(t.action),
    entityTypeIdx: index('activity_log_entity_type_idx').on(t.entityType),
    entityIdIdx: index('activity_log_entity_id_idx').on(t.entityId),
    createdAtIdx: index('activity_log_created_at_idx').on(t.createdAt),

    // Combined indexes for common filtering scenarios
    userActionIdx: index('activity_log_user_action_idx').on(t.userId, t.action),
    entityTypeActionIdx: index('activity_log_entity_type_action_idx').on(
      t.entityType,
      t.action
    ),

    // Full-text search on description
    descriptionSearchIdx: index('activity_log_description_search_idx').using(
      'gin',
      sql`to_tsvector('english', ${t.description})`
    ),
  })
)

export const retellAICallLogs = pgTable(
  'retell_ai_call_logs',
  {
    id: serial('id').primaryKey(), // Primary Key with bigint (auto increment)
    patientId: integer('patient_id')
      .notNull()
      .references(() => patients.id), // User
    taskId: integer('task_id')
      .notNull()
      .references(() => Tasks.id), // User
    fromNumber: varchar('from_number', { length: 255 }), // From Number
    time: varchar('time', { length: 255 }), // Time
    duration: varchar('duration', { length: 255 }), // Duration
    type: varchar('type', { length: 255 }), // Type
    cost: varchar('cost', { length: 255 }), // Cost
    callId: varchar('call_id', { length: 255 }), // Call ID
    agentId: varchar('agent_id', { length: 255 }), // Agent ID
    disconnectionReason: text('disconnection_reason'), // Disconnection Reason
    callStatus: text('call_status'), // Call Status
    userSentiment: text('user_sentiment'), // User Sentiment
    recording_url: text('recording_url'), // Recording URL
    metaData: text('meta_data'), // Meta Data
    transcript: text('transcript'), // Transcript
    transcriptObject: json('transcript_object'), // Transcript Object
    callSummary: text('call_summary'), // Call Summary
    detailedCallSummary: text('detailed_call_summary'), // Detailed Call Summary
    callOutCome: text('call_out_come'), // Call Out Come
    customerEngagement: text('customer_engagement'), // Customer Engagement
    abandonedPurchaseReason: text('abandoned_purchase_reason'), // Abandoned Purchase Reason
    callBackTime: text('call_back_time'), // Call Back Time
    startTimestamp: timestamp('start_timestamp', { withTimezone: false }), // Start Timestamp
    endTimestamp: timestamp('end_timestamp', { withTimezone: false }), // End Timestamp
    retellDynamicVariables: json('retell_dynamic_variables'), // Retell Dynamic Variables
    createdAt: timestamp('created_at', { withTimezone: false })
      .defaultNow()
      .notNull(), // Timestamp
    updatedAt: timestamp('updated_at', { withTimezone: false }).$default(
      () => new Date()
    ), //
  },
  (t) => ({
    patientIdIdx: index('retell_ai_call_logs_patient_id_idx').on(t.patientId),
    taskIdIdx: index('retell_ai_call_logs_task_id_idx').on(t.taskId),
    timeIdx: index('retell_ai_call_logs_time_idx').on(t.time),
    durationIdx: index('retell_ai_call_logs_duration_idx').on(t.duration),
    typeIdx: index('retell_ai_call_logs_type_idx').on(t.type),
    costIdx: index('retell_ai_call_logs_cost_idx').on(t.cost),
    callIdIdx: index('retell_ai_call_logs_call_id_idx').on(t.callId),
    disconnectionReasonIdx: index(
      'retell_ai_call_logs_disconnection_reason_idx'
    ).on(t.disconnectionReason),
    callStatusIdx: index('retell_ai_call_logs_call_status_idx').on(
      t.callStatus
    ),
    userSentimentIdx: index('retell_ai_call_logs_user_sentiment_idx').on(
      t.userSentiment
    ),
    recordingUrlIdx: index('retell_ai_call_logs_recording_url_idx').on(
      t.recording_url
    ),
    metaDataIdx: index('retell_ai_call_logs_meta_data_idx').on(t.metaData),
    createdAtIdx: index('retell_ai_call_logs_created_at_idx').on(t.createdAt),
  })
)

// Patient Payments table
export const patientPayments = pgTable(
  'patient_payments',
  {
    id: serial('id').primaryKey(),

    patientId: integer('patient_id').notNull(),
    productId: integer('product_id').references(() => products.id),

    paymentId: text('payment_id'),
    status: text('status').notNull(),

    amount: real('amount').notNull(),
    metadata: jsonb('metadata'),

    subscriptionId: text('subscription_id').references(
      () => patientSubscriptions.subscriptionId
    ),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    // Indexes for common query patterns
    paymentIdIdx: index('patient_payments_payment_id_idx').on(t.paymentId),
    statusIdx: index('patient_payments_status_idx').on(t.status),
  })
)

// Patient OTP Tokens Table
export const patientOtpTokens = pgTable(
  'patient_otp_tokens',
  {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }), // Cascade delete if patient is deleted
    otp: varchar('otp', { length: 10 }).notNull(), // Store OTP - consider hashing in production if needed
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    patientIdIdx: index('patient_otp_patient_id_idx').on(t.patientId),
    expiresAtIdx: index('patient_otp_expires_at_idx').on(t.expiresAt),
  })
)

export type InsertPatientType = InferInsertModel<typeof patients>

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name').notNull(),
  code: varchar('code', { length: 255 }),
  description: text('description'),
  image: text('image'),

  price: numeric('price').notNull(),

  paymentProvider: varchar('payment_provider', { length: 255 }),
  paymentProviderProductId: varchar('payment_provider_product_id', {
    length: 255,
  }),

  is_subscription: boolean('is_subscription').default(false),
  subscription_interval: varchar('subscription_interval'),

  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

export const paymentForms = pgTable('payment_forms', {
  id: serial('id').primaryKey(),
  name: varchar('name').notNull(),
  slug: varchar('slug').notNull(),
  brandCode: varchar('brand_code', { length: 255 }).default('parkingmd'),
  description: text('description'),
  redirect_url: text('redirect_url'),
  popular_product_id: integer('popular_product_id').references(
    () => products.id
  ),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

export const paymentFormsProducts = pgTable('payment_forms_products', {
  id: serial('id').primaryKey(),
  payment_form_id: integer('payment_form_id').references(() => paymentForms.id),
  product_id: integer('product_id').references(() => products.id),
  product_type: varchar('product_type').default('default'),
  display_order: integer('display_order'),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

export const couponTypeEnum = pgEnum('coupon_type', ['fixed', 'percentage'])

export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 255 }).notNull().unique(),
  type: couponTypeEnum('type').default('percentage'),
  brandCode: varchar('brand_code', { length: 255 }).default('parkingmd'),
  discountAmount: real('discount_amount'),
  percentageOff: real('percentage_off').default(0),

  // // Usage limits
  // usageLimit: integer("usage_limit"),
  // usageCount: integer("usage_count").default(0), //* different table for handling customer and patient

  // // Minimum order amount to apply the coupon
  // minimumOrderAmount: real("minimum_order_amount").default(0),

  expiryDate: timestamp('expiry_date'),
  is_active: boolean('is_active').default(true),

  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

export const calComWebhookLogs = pgTable(
  'cal_com_webhook_logs',
  {
    id: serial('id').primaryKey(),
    triggerEvent: varchar('trigger_event', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('received'),
    payload: json('payload').notNull(),
    processedAt: timestamp('processed_at'),
    error: text('error'),
    taskCode: varchar('task_code', { length: 255 }),
    bookingId: integer('booking_id'),
    calBookingUid: varchar('cal_booking_uid', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  // Indexes for efficient querying
  (t) => ({
    triggerEventIdx: index('cal_com_webhook_logs_trigger_event_idx').on(
      t.triggerEvent
    ),
    statusIdx: index('cal_com_webhook_logs_status_idx').on(t.status),
    taskCodeIdx: index('cal_com_webhook_logs_task_code_idx').on(t.taskCode),
    bookingIdIdx: index('cal_com_webhook_logs_booking_id_idx').on(t.bookingId),
    calBookingUidIdx: index('cal_com_webhook_logs_cal_booking_uid_idx').on(
      t.calBookingUid
    ),
    createdAtIdx: index('cal_com_webhook_logs_created_at_idx').on(t.createdAt),
  })
)

export const newsletterIntrest = pgTable('newsletter_intrest', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => patients.id),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
})

// Enum for template types
export const templateTypeEnum = pgEnum('template_type', ['email', 'sms'])

// Main templates table
export const notificationTemplates = pgTable('notification_templates', {
  id: serial('id').primaryKey(),
  templateKey: varchar('template_key', { length: 100 }).notNull().unique(), // e.g., 'parkingmd_checkout_email'
  name: varchar('name', { length: 255 }).notNull(), // Human readable name
  type: templateTypeEnum('type').notNull(), // 'email' or 'sms'
  brandCode: varchar('brand_code', { length: 50 })
    .notNull()
    .default('parkingmd'),

  // Template content
  heading1: varchar('heading1', { length: 500 }),
  heading2: varchar('heading2', { length: 500 }),
  title: varchar('title', { length: 500 }), // For emails only
  preview: varchar('preview', { length: 255 }), // For email preview
  content: text('content'), // For markdown content

  // Metadata
  isActive: boolean('is_active').notNull().default(true),

  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
})

export const callerNumbers = pgTable('caller_numbers', {
  id: serial('id').primaryKey(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  brandCode: varchar('brand_code', { length: 255 }).default('parkingmd'),
  maxDailyUtilization: integer('max_daily_utilization').notNull().default(149),
  agentId: varchar('agent_id', { length: 255 }),
  agentName: varchar('agent_name', { length: 255 }),
  isActive: boolean('is_active').default(true),
  isLateNight: boolean('is_late_night').default(false),
  isRenewals: boolean('is_renewals').default(false),
  description: varchar('description', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').$default(() => new Date()),
})

export const retellJobs = pgTable(
  'retell_jobs',
  {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id').references(() => patients.id),

    taskId: integer('task_id'),
    agent: varchar('agent', { length: 255 }),
    payload: jsonb('payload'),
    error: varchar('error', { length: 255 }),
    status: varchar('status', { length: 255 }).default('pending'),

    // NEW: When the job should be processed (respects calling hours)
    scheduledAt: timestamp('scheduled_at'),

    recievedAt: timestamp('recieved_at'),
    processedAt: timestamp('processed_at'),

    queueName: varchar('queue_name', { length: 255 }).default('active'),

    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').$default(() => new Date()),
  },
  (t) => ({
    // Add index for efficient scheduling queries
    scheduledAtStatusIdx: index('retell_jobs_scheduled_status_idx').on(
      t.scheduledAt,
      t.status
    ),
  })
)

export const earningStatusEnum = pgEnum('earning_status', [
  'pending', // Waiting for friend to finish
  'confirmed', // Ready to withdraw (Task completed + buffer)
  'declined', // Friend refunded or rejected
  'paid', // Money moved to a Payout Request
])

export const payoutStatusEnum = pgEnum('payout_status', [
  'requested', // User clicked withdraw
  'processing', // API call in flight
  'completed', // Money sent
  'failed', // API error
])

// export const patients = pgTable('patients', {
//   id: serial('id').primaryKey(),

//   // ... existing fields (name, email, etc) ...

//   // [NEW] Referral Specific Fields
//   referralCode: text('referral_code').unique().notNull(), // "JOHN-42"
//   referredByPatientId: integer('referred_by_patient_id'), // Who invited me?

//   isReferralActive: boolean('is_referral_active').default(true).notNull(), // Kill switch for spam
//   referralBonusAmount: decimal('referral_bonus_amount', { precision: 10, scale: 2 }), // VIP override ($10.00)
// }, (t) => ({
//   // Index for fast lookup when a user clicks a link
//   referralCodeIdx: uniqueIndex('referral_code_idx').on(t.referralCode),
// }));

// ----------------------------------------------------------------------
// 3. REFERRAL CONFIG - Now stored in settings table with these keys:
//    - referral_enabled: "true" | "false"
//    - referral_reward_amount: "5.00"
//    - referral_min_purchase_amount: "0.00"
//    - referral_min_withdrawal_amount: "50.00"
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// 4. REFERRAL EARNINGS (The Ledger)
// ----------------------------------------------------------------------
export const referralEarnings = pgTable('referral_earnings', {
  id: serial('id').primaryKey(),

  referrerPatientId: integer('referrer_patient_id')
    .references(() => patients.id)
    .notNull(), // User A (Earner)
  refereePatientId: integer('referee_patient_id')
    .references(() => patients.id)
    .notNull(), // User B (Friend)

  // Audit Trail: Link to the specific application task
  taskId: integer('task_id').notNull(),

  // Link to Payout (Once withdrawn)
  payoutId: integer('payout_id'),

  // Financials
  earnedAmount: decimal('earned_amount', { precision: 10, scale: 2 }).notNull(), // $5.00
  taskPaidAmount: decimal('task_paid_amount', {
    precision: 10,
    scale: 2,
  }).notNull(), // $99.00 (ROI tracking)

  status: earningStatusEnum('status').default('pending').notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  confirmedAt: timestamp('confirmed_at'), // When status -> confirmed
  declinedAt: timestamp('declined_at'), // When status -> declined
  declineReason: text('decline_reason'), // "Refunded"
})

// ----------------------------------------------------------------------
// 5. PATIENT PAYOUTS (The Checkbook)
// ----------------------------------------------------------------------
export const patientPayouts = pgTable('patient_payouts', {
  id: serial('id').primaryKey(),

  patientId: integer('patient_id')
    .references(() => patients.id)
    .notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(), // Total (e.g. $50.00)

  status: payoutStatusEnum('status').default('requested').notNull(),
  payoutMethod: text('payout_method').notNull(),

  // JSONB for flexibility (Email for Amazon, Phone for Venmo, etc.)
  payoutDetails: jsonb('payout_details').notNull(),

  // API Audit
  transactionReference: text('transaction_reference'), // External ID (Tremendous/Tango)
  failureReason: text('failure_reason'),

  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
})

export type UpdatePatientType = Partial<InsertPatientType>
export type TaskType = InferInsertModel<typeof Tasks>
export type TaskTypeSelect = InferSelectModel<typeof Tasks>
export type UpdateTaskType = Partial<TaskType>
export type ServiceConfiguration = InferSelectModel<
  typeof serviceConfigurations
>
export type Appointment = InferSelectModel<typeof appointments>

export const draftFormsResponse = pgTable('draft_forms_response', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id')
    .references(() => Tasks.id)
    .notNull(),
  response: json('response'),
  formKey: varchar('form_key', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
