import { gql } from "apollo-server";

export const typeDefs = gql`
  # ========================
  # Input Types (must come before Mutation type)
  # ========================
  
  input CredentialsInput {
    email: String!
    password: String!
  }

  input AppointmentInput {
    clinicId: String!
    roomId: String!
    clinicianId: String!
    patientId: String!
    appointmentDate: String!
    appointmentTime: String!
    durationMinutes: Int
    status: String
    reason: String!
    notes: String
    productId: String
    productVariationId: String
  }

  input ClinicInput {
    name: String!
    address: String!
    phone: String!
    email: String!
    clientOrgId: String
  }

  input ClinicianInput {
    clinicId: String!
    firstName: String!
    lastName: String!
    clinicianType: String!
    email: String!
    phone: String!
    isActive: Boolean
  }

  input PatientInput {
    firstName: String!
    lastName: String!
    dateOfBirth: String!
    email: String!
    phone: String!
    address: String!
    medicalNotes: String
  }

  input NotificationInput {
    userId: String!
    title: String!
    message: String!
    type: String!
    priority: String
    actionUrl: String
  }

  input ProductInput {
    categoryId: String!
    subcategoryId: String
    name: String!
    description: String
    productType: String!
    sku: String!
    price: Float
    orderBy: Int
    isActive: Boolean
  }

  input RoomInput {
    clinicId: String!
    roomNumber: String!
    roomType: String
    isActive: Boolean
  }

  input RoleInput {
    name: String!
    description: String
  }

  input CreateUserInput {
    email: String!
    password: String!
    first_name: String!
    last_name: String!
    phone: String
    phone_country_code: String
    address_line1: String
    address_line2: String
    city: String
    postal_code: String
    country: String
    user_image: String
    role_id: String!
    clinic_id: String
    clinician_id: String
    patient_id: String
    is_active: Boolean
  }

  input UpdateUserInput {
    email: String
    password: String
    first_name: String
    last_name: String
    phone: String
    phone_country_code: String
    address_line1: String
    address_line2: String
    city: String
    postal_code: String
    country: String
    user_image: String
    role_id: String
    clinic_id: String
    clinician_id: String
    patient_id: String
    is_active: Boolean
  }

  input UpdateProfileInput {
    first_name: String
    last_name: String
    phone: String
    phone_country_code: String
    address_line1: String
    address_line2: String
    city: String
    postal_code: String
    country: String
    user_image: String
    current_password: String
    password: String
  }

  input CreateClinicInput {
    name: String!
    address: String!
    email: String!
    phone: String!
    is_primary: Boolean
  }

  input UpdateClinicInput {
    name: String
    address: String
    email: String
    phone: String
    is_primary: Boolean
    is_active: Boolean
  }

  input CreateRoomInput {
    clinic_id: String!
    room_number: String!
    room_type: String
    clinician_type: String
  }

  input UpdateRoomInput {
    clinic_id: String
    room_number: String
    room_type: String
    clinician_type: String
    is_active: Boolean
  }

  input CreateProductInput {
    clinic_id: String
    category_id: String
    subcategory_id: String
    name: String!
    description: String
    product_type: String!
    price: Float
    sku: String!
    is_active: Boolean
  }

  input UpdateProductInput {
    name: String
    description: String
    price: Float
    sku: String
    is_active: Boolean
  }

  input CreateProductCategoryInput {
    clinic_id: String
    name: String!
    description: String
    is_active: Boolean
  }

  input UpdateProductCategoryInput {
    name: String
    description: String
    is_active: Boolean
  }

  input CreateProductSubcategoryInput {
    clinic_id: String
    category_id: String!
    name: String!
    description: String
    is_active: Boolean
  }

  input UpdateProductSubcategoryInput {
    name: String
    description: String
    is_active: Boolean
  }

  input CreateAvailabilityInput {
    clinician_id: String!
    clinic_id: String!
    recurrence_type: String! # daily, weekly, monthly, custom
    start_time: String!
    end_time: String!
    day_of_week: Int # For weekly recurrence: 0-6 (Sunday-Saturday)
    exclude_weekends: Boolean
    exclude_saturday: Boolean
    exclude_sunday: Boolean
    excluded_days: String # JSON array of day numbers to exclude
    custom_dates: String # JSON array of dates for custom recurrence
    valid_from: String
    valid_until: String
    room_id: String
  }

  input UpdateAvailabilityInput {
    clinician_id: String
    clinic_id: String
    recurrence_type: String
    start_time: String
    end_time: String
    day_of_week: Int
    exclude_weekends: Boolean
    exclude_saturday: Boolean
    exclude_sunday: Boolean
    excluded_days: String
    custom_dates: String
    valid_from: String
    valid_until: String
    room_id: String
    is_active: Boolean
  }

  input CreateClinicianTypeInput {
    name: String!
    description: String
  }

  input UpdateClinicianTypeInput {
    name: String
    description: String
    is_active: Boolean
  }

  input CreateRoomTypeInput {
    name: String!
    description: String
  }

  input UpdateRoomTypeInput {
    name: String
    description: String
    is_active: Boolean
  }

  input CreateClinicianInput {
    clinic_id: String!
    first_name: String!
    last_name: String!
    clinician_type: String!
    gender: String
    email: String!
    phone: String!
    language_ids: [String!]
    is_active: Boolean
  }

  input UpdateClinicianInput {
    clinic_id: String
    first_name: String
    last_name: String
    clinician_type: String
    gender: String
    email: String
    phone: String
    language_ids: [String!]
    is_active: Boolean
  }

  input CreateLanguageInput {
    name: String!
    code: String!
    is_active: Boolean
  }

  input UpdateLanguageInput {
    name: String
    code: String
    is_active: Boolean
  }

  input CreatePatientInput {
    first_name: String!
    last_name: String!
    date_of_birth: String!
    email: String!
    phone: String!
    address: String!
    medical_notes: String
    title: String
    status: String
    birth_surname: String
    birth_name: String
    birth_names: String
    social_security_number: String
    gender: String
    sex: String
    google_client_id: String
    payment_reference: String
    occupation: String
    place_of_birth: String
    phones: String
    address_structured: String
  }

  input UpdatePatientInput {
    first_name: String
    last_name: String
    date_of_birth: String
    email: String
    phone: String
    address: String
    medical_notes: String
    title: String
    status: String
    birth_surname: String
    birth_name: String
    birth_names: String
    social_security_number: String
    gender: String
    sex: String
    google_client_id: String
    payment_reference: String
    occupation: String
    place_of_birth: String
    phones: String
    address_structured: String
  }

  input CreateAppointmentInput {
    clinic_id: String!
    room_id: String!
    clinician_id: String!
    patient_id: String!
    appointment_date: String!
    appointment_time: String!
    duration_minutes: Int
    status: String
    reason: String!
    notes: String
    product_id: String
    product_variation_id: String
  }

  input UpdateAppointmentInput {
    clinic_id: String
    room_id: String
    clinician_id: String
    patient_id: String
    appointment_date: String
    appointment_time: String
    duration_minutes: Int
    status: String
    reason: String
    notes: String
    product_id: String
    product_variation_id: String
  }

  input CreateSpacerBlockInput {
    clinician_id: String!
    clinic_id: String!
    room_id: String
    block_date: String
    start_time: String!
    end_time: String!
    reason: String
    recurrence_type: String!
    recurrence_days: String
    end_date: String
  }

  input UpdateSpacerBlockInput {
    clinician_id: String
    clinic_id: String
    room_id: String
    block_date: String
    start_time: String
    end_time: String
    reason: String
    recurrence_type: String
    recurrence_days: String
    end_date: String
  }

  input CreateRoomBlockInput {
    room_id: String!
    clinic_id: String!
    block_date: String!
    start_time: String!
    end_time: String!
    reason: String
    is_recurring: Boolean
  }

  input UpdateRoomBlockInput {
    room_id: String
    clinic_id: String
    block_date: String
    start_time: String
    end_time: String
    reason: String
    is_recurring: Boolean
  }

  input SearchInput {
    search: String
    limit: Int
    offset: Int
    orderBy: String
    orderDirection: String
    startDate: String
    endDate: String
    clinicId: ID
    roomIds: [ID!]
  }

  # ========================
  # Pagination Types
  # ========================

  type PageInfo {
    total: Int!
    limit: Int!
    offset: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  type ClinicsConnection {
    data: [Clinic!]!
    pageInfo: PageInfo!
  }

  type RoomsConnection {
    data: [Room!]!
    pageInfo: PageInfo!
  }

  type ProductsConnection {
    data: [Product!]!
    pageInfo: PageInfo!
  }

  type PatientsConnection {
    data: [Patient!]!
    pageInfo: PageInfo!
  }

  type ClinicianLanguagesConnection {
    data: [ClinicianLanguage!]!
    pageInfo: PageInfo!
  }

  type AppointmentsConnection {
    data: [Appointment!]!
    pageInfo: PageInfo!
  }

  type LanguagesConnection {
    data: [Language!]!
    pageInfo: PageInfo!
  }

  type ClinicianAvailabilityConnection {
    data: [ClinicianAvailability!]!
    pageInfo: PageInfo!
  }

  type ClinicianTypesConnection {
    data: [ClinicianType!]!
    pageInfo: PageInfo!
  }

  type RoomTypesConnection {
    data: [RoomType!]!
    pageInfo: PageInfo!
  }

  type SpacerBlocksConnection {
    data: [SpacerBlock!]!
    pageInfo: PageInfo!
  }

  type RoomBlocksConnection {
    data: [RoomBlock!]!
    pageInfo: PageInfo!
  }

  # ========================
  # Dashboard Types
  # ========================

  type DashboardStats {
    totalClinics: Int!
    totalClinicians: Int!
    totalPatients: Int!
    todayAppointments: Int!
    upcomingAppointments: Int!
  }

  type AppointmentAnalytics {
    date: String!
    scheduled: Int!
    completed: Int!
    cancelled: Int!
    total: Int!
  }

  type StatusAnalytics {
    name: String!
    value: Int!
  }

  type PatientRegistration {
    date: String!
    count: Int!
  }

  type DashboardAnalytics {
    appointmentData: [AppointmentAnalytics!]!
    statusData: [StatusAnalytics!]!
    patientRegistrationData: [PatientRegistration!]!
  }

  input DateRangeInput {
    startDate: String!
    endDate: String!
  }

  # ========================
  # Enums
  # ========================

  enum ClinicianType {
    GP
    Nurse
    Specialist
    Dentist
    Therapist
    Consultant
  }

  # ========================
  # Query Type
  # ========================

  type Query {
    me: User
    users: [User!]!
    user(id: ID!): User
    myProfile: UserProfile
    userProfile(id: ID!): UserProfile
    allUserProfiles: [UserProfile!]!
    searchUserProfiles(search: String!): [UserProfile!]!
    userRoles: [UserRole!]!
    allRoles: [UserRole!]!
    role(id: ID!): UserRole
    appointments(search: SearchInput): [Appointment!]!
    appointmentsPaginated(search: SearchInput): AppointmentsConnection!
    appointment(id: ID!): Appointment
    clinics(search: SearchInput): [Clinic!]!
    clinicsPaginated(search: SearchInput): ClinicsConnection!
    clinic(id: ID!): Clinic
    clinicians(search: SearchInput): [Clinician!]!
    clinician(id: ID!): Clinician
    languages(search: SearchInput): [Language!]!
    languagesPaginated(search: SearchInput): LanguagesConnection!
    language(id: ID!): Language
    patients(search: SearchInput): [Patient!]!
    patientsPaginated(search: SearchInput): PatientsConnection!
    patient(id: ID!): Patient
    notifications: [Notification!]!
    products(search: SearchInput): [Product!]!
    productsPaginated(search: SearchInput): ProductsConnection!
    product(id: ID!): Product
    productCategories(search: SearchInput): [ProductCategory!]!
    productSubcategories(category_id: ID, search: SearchInput): [ProductSubcategory!]!
    rooms(search: SearchInput, clinicId: ID): [Room!]!
    roomsPaginated(search: SearchInput, clinicId: ID): RoomsConnection!
    room(id: ID!): Room
    availabilities(search: SearchInput): [ClinicianAvailability!]!
    availabilitiesPaginated(search: SearchInput): ClinicianAvailabilityConnection!
    spacerBlocks(search: SearchInput): [SpacerBlock!]!
    spacerBlocksPaginated(search: SearchInput): SpacerBlocksConnection!
    roomBlocks(search: SearchInput): [RoomBlock!]!
    roomBlocksPaginated(search: SearchInput): RoomBlocksConnection!
    clinicianTypes: [ClinicianType!]!
    roomTypes: [RoomType!]!
    subscriptions: [OrganizationSubscription!]!
    
    # Dashboard Queries
    dashboardStats: DashboardStats!
    dashboardAnalytics(dateRange: DateRangeInput!): DashboardAnalytics!
  }

  # ========================
  # Mutation Type
  # ========================

  type Mutation {
    # Auth Mutations
    signup(credentials: CredentialsInput!, firstName: String!, lastName: String!, phone: String, phoneCountryCode: String, addressLine1: String, addressLine2: String, city: String, postalCode: String, country: String): AuthPayload!
    verifyEmail(email: String!, token: String!): AuthPayload!
    signin(credentials: CredentialsInput!): AuthPayload!
    requestPasswordReset(email: String!): AuthPayload!
    resetPassword(email: String!, token: String!, newPassword: String!): AuthPayload!
    userDelete(userId: ID!): AuthPayload!

    # Admin User Mutations
    adminCreateUser(input: CreateUserInput!): UserPayload!
    adminUpdateUser(userId: ID!, input: UpdateUserInput!): UserPayload!
    adminDeleteUser(userId: ID!): UserPayload!

    # User Profile Mutations
    updateProfile(input: UpdateProfileInput!): UserPayload!

    # Image Upload Mutations
    uploadProfileImage(imageBase64: String!, filename: String): UserPayload!
    deleteProfileImage: UserPayload!

    # Clinic Mutations
    createClinic(input: CreateClinicInput!): ClinicPayload!
    updateClinic(id: ID!, input: UpdateClinicInput!): ClinicPayload!
    deleteClinic(id: ID!): ClinicPayload!

    # Room Mutations
    createRoom(input: CreateRoomInput!): RoomPayload!
    updateRoom(id: ID!, input: UpdateRoomInput!): RoomPayload!
    deleteRoom(id: ID!): RoomPayload!

    # Product Mutations
    createProduct(input: CreateProductInput!): ProductPayload!
    updateProduct(id: ID!, input: UpdateProductInput!): ProductPayload!
    deleteProduct(id: ID!): ProductPayload!

    # Product Category Mutations
    createProductCategory(input: CreateProductCategoryInput!): ProductCategoryPayload!
    updateProductCategory(id: ID!, input: UpdateProductCategoryInput!): ProductCategoryPayload!
    deleteProductCategory(id: ID!): ProductCategoryPayload!

    # Product Subcategory Mutations
    createProductSubcategory(input: CreateProductSubcategoryInput!): ProductSubcategoryPayload!
    updateProductSubcategory(id: ID!, input: UpdateProductSubcategoryInput!): ProductSubcategoryPayload!
    deleteProductSubcategory(id: ID!): ProductSubcategoryPayload!

    # Clinician Availability Mutations
    createAvailability(input: CreateAvailabilityInput!): AvailabilityPayload!
    updateAvailability(id: ID!, input: UpdateAvailabilityInput!): AvailabilityPayload!
    deleteAvailability(id: ID!): AvailabilityPayload!

    # Clinician Mutations
    createClinician(input: CreateClinicianInput!): ClinicianPayload!
    updateClinician(id: ID!, input: UpdateClinicianInput!): ClinicianPayload!
    deleteClinician(id: ID!): ClinicianPayload!

    # Clinician Type Mutations (Admin Only)
    createClinicianType(input: CreateClinicianTypeInput!): ClinicianTypePayload!
    updateClinicianType(id: ID!, input: UpdateClinicianTypeInput!): ClinicianTypePayload!
    deleteClinicianType(id: ID!): ClinicianTypePayload!

    # Room Type Mutations (Admin Only)
    createRoomType(input: CreateRoomTypeInput!): RoomTypePayload!
    updateRoomType(id: ID!, input: UpdateRoomTypeInput!): RoomTypePayload!
    deleteRoomType(id: ID!): RoomTypePayload!

    # Language Mutations
    createLanguage(input: CreateLanguageInput!): LanguagePayload!
    updateLanguage(id: ID!, input: UpdateLanguageInput!): LanguagePayload!
    deleteLanguage(id: ID!): LanguagePayload!

    # Patient Mutations
    createPatient(input: CreatePatientInput!): PatientPayload!
    updatePatient(id: ID!, input: UpdatePatientInput!): PatientPayload!
    deletePatient(id: ID!): PatientPayload!

    # Appointment Mutations
    createAppointment(input: CreateAppointmentInput!): AppointmentPayload!
    updateAppointment(id: ID!, input: UpdateAppointmentInput!): AppointmentPayload!
    cancelAppointment(id: ID!): AppointmentPayload!
    deleteAppointment(id: ID!): AppointmentPayload!

    # Spacer Block Mutations
    createSpacerBlock(input: CreateSpacerBlockInput!): SpacerBlockPayload!
    updateSpacerBlock(id: ID!, input: UpdateSpacerBlockInput!): SpacerBlockPayload!
    deleteSpacerBlock(id: ID!): SpacerBlockPayload!

    # Room Block Mutations
    createRoomBlock(input: CreateRoomBlockInput!): RoomBlockPayload!
    updateRoomBlock(id: ID!, input: UpdateRoomBlockInput!): RoomBlockPayload!
    deleteRoomBlock(id: ID!): RoomBlockPayload!

    # Legacy Mutations (deprecated)
    appointmentCreate(appointment: AppointmentInput!): AppointmentPayload!
    appointmentUpdate(appointmentId: ID!, appointment: AppointmentInput!): AppointmentPayload!
    appointmentCancel(appointmentId: ID!): AppointmentPayload!
    clinicCreate(clinic: ClinicInput!): ClinicPayload!
    clinicUpdate(clinicId: ID!, clinic: ClinicInput!): ClinicPayload!
    clinicianCreate(clinician: ClinicianInput!): ClinicianPayload!
    clinicianUpdate(clinicianId: ID!, clinician: ClinicianInput!): ClinicianPayload!
    patientCreate(patient: PatientInput!): PatientPayload!
    patientUpdate(patientId: ID!, patient: PatientInput!): PatientPayload!
    notificationCreate(notification: NotificationInput!): NotificationPayload!
    notificationMarkAsRead(notificationId: ID!): NotificationPayload!
    productCreate(product: ProductInput!): ProductPayload!
    productUpdate(productId: ID!, product: ProductInput!): ProductPayload!
    productDelete(productId: ID!): ProductPayload!
    roomCreate(room: RoomInput!): RoomPayload!
    roomUpdate(roomId: ID!, room: RoomInput!): RoomPayload!
    roleCreate(role: RoleInput!): RolePayload!
    roleUpdate(roleId: ID!, role: RoleInput!): RolePayload!
    roleDelete(roleId: ID!): RolePayload!
  }

  type User {
    id: ID!
    userProfile: UserProfile
    auditLogs: [AuditLog!]!
    notifications: [Notification!]!
  }

  type UserProfile {
    id: ID!
    role_id: String!
    first_name: String!
    last_name: String!
    email: String!
    phone: String
    phone_country_code: String
    address_line1: String
    address_line2: String
    city: String
    postal_code: String
    country: String
    user_image: String
    clinic_id: String
    clinician_id: String
    patient_id: String
    is_active: Boolean!
    created_at: String!
    updated_at: String!
    client_org_id: String
    user: User!
    role: UserRole!
    clinic: Clinic
    clinician: Clinician
    patient: Patient
    clientOrg: ClientOrganization
  }

  type UserRole {
    id: ID!
    name: String!
    description: String
    created_at: String!
  }

  type AuditLog {
    id: ID!
    userId: String
    action: String!
    resource: String!
    resourceId: String
    details: String!
    ipAddress: String
    created_at: String!
  }

  type Appointment {
    id: ID!
    clinicId: String!
    roomId: String!
    clinicianId: String!
    patientId: String!
    appointmentDate: String!
    appointmentTime: String!
    durationMinutes: Int!
    status: String!
    reason: String!
    notes: String!
    productId: String
    productVariationId: String
    created_at: String!
    updated_at: String!
    clinic: Clinic!
    room: Room!
    clinician: Clinician!
    patient: Patient!
    product: Product
    productVariation: ProductVariation
  }

  type Clinic {
    id: ID!
    name: String!
    address: String!
    phone: String!
    email: String!
    is_primary: Boolean
    is_active: Boolean
    is_deleted: Boolean
    created_at: String!
    client_org_id: String
    clientOrgId: String
    clientOrganization: ClientOrganization
    appointments: [Appointment!]!
    rooms: [Room!]!
    clinicians: [Clinician!]!
  }

  type Language {
    id: ID!
    name: String!
    code: String!
    isActive: Boolean!
    is_active: Boolean
    created_at: String!
  }

  type ClinicianLanguage {
    id: ID!
    clinician_id: String!
    language_id: String!
    is_deleted: Boolean!
    created_at: String!
    clinician: Clinician
    language: Language
  }

  type ClinicianType {
    id: ID!
    name: String!
    description: String
    isActive: Boolean!
    is_active: Boolean
    createdAt: String!
    created_at: String
    updatedAt: String!
    updated_at: String
  }

  type RoomType {
    id: ID!
    name: String!
    description: String
    isActive: Boolean!
    is_active: Boolean
    createdAt: String!
    created_at: String
    updatedAt: String!
    updated_at: String
  }

  type Clinician {
    id: ID!
    clinicId: String!
    clinic_id: String
    firstName: String!
    lastName: String!
    clinicianType: String!
    clinician_type: String
    gender: String
    email: String!
    phone: String!
    isActive: Boolean!
    is_active: Boolean
    created_at: String!
    clinic: Clinic!
    appointments: [Appointment!]!
    availability: [ClinicianAvailability!]!
    languages: [Language!]!
  }

  type ClinicianAvailability {
    id: ID!
    clinicianId: String!
    clinicId: String!
    dayOfWeek: Int
    startTime: String!
    endTime: String!
    recurrenceType: String!
    customDates: String
    excludeWeekends: Boolean!
    excludeSaturday: Boolean!
    excludeSunday: Boolean!
    excludedDays: String
    validFrom: String!
    validUntil: String
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
    roomId: String
    clinician: Clinician!
    clinic: Clinic!
    room: Room
  }

  type Patient {
    id: ID!
    first_name: String!
    last_name: String!
    date_of_birth: String!
    email: String!
    phone: String!
    address: String!
    medical_notes: String
    created_at: String!
    is_deleted: Boolean!
    appointments: [Appointment!]!
  }

  type Notification {
    id: ID!
    userId: String!
    title: String!
    message: String!
    type: String!
    priority: String!
    isRead: Boolean!
    actionUrl: String
    metadata: String
    created_at: String!
    user: User!
  }

  type Product {
    id: ID!
    clinicId: String
    categoryId: String!
    subcategoryId: String
    name: String!
    description: String
    productType: String!
    sku: String!
    price: Float
    isActive: Boolean!
    clinic_id: String
    category_id: String
    subcategory_id: String
    product_type: String
    is_active: Boolean
    is_deleted: Boolean
    created_at: String!
    category: ProductCategory!
    subcategory: ProductSubcategory
    variations: [ProductVariation!]!
    appointments: [Appointment!]!
  }

  type ProductVariation {
    id: ID!
    productId: String!
    variationName: String!
    sku: String!
    price: Float!
    stockQuantity: Int!
    isActive: Boolean!
    created_at: String!
    product: Product!
    appointments: [Appointment!]!
  }

  type ProductCategory {
    id: ID!
    name: String!
    description: String
    isActive: Boolean!
    clinic_id: String
    is_active: Boolean
    is_deleted: Boolean
    created_at: String!
    products: [Product!]!
  }

  type ProductSubcategory {
    id: ID!
    categoryId: String!
    name: String!
    description: String
    isActive: Boolean!
    clinic_id: String
    category_id: String
    is_active: Boolean
    is_deleted: Boolean
    created_at: String!
    category: ProductCategory!
    products: [Product!]!
  }

  type Room {
    id: ID!
    clinicId: String!
    roomNumber: String!
    roomType: String
    roomTypeName: String
    isActive: Boolean!
    clinic_id: String
    room_number: String
    room_type: String
    clinicianType: String
    clinicianTypeName: String
    clinician_type: String
    is_active: Boolean
    is_deleted: Boolean
    created_at: String!
    clinic: Clinic
    appointments: [Appointment!]!
  }

  type SpacerBlock {
    id: ID!
    clinician_id: String!
    clinic_id: String!
    room_id: String
    block_date: String
    start_time: String!
    end_time: String!
    reason: String
    recurrence_type: String!
    recurrence_days: String
    end_date: String
    is_deleted: Boolean!
    created_at: String!
    clinician: Clinician!
    clinic: Clinic!
    room: Room
  }

  type RoomBlock {
    id: ID!
    room_id: String!
    clinic_id: String!
    block_date: String!
    start_time: String!
    end_time: String!
    reason: String
    is_recurring: Boolean!
    is_deleted: Boolean!
    created_at: String!
    room: Room!
    clinic: Clinic!
  }

  type ClientOrganization {
    id: ID!
    name: String!
    code: String!
    contactEmail: String!
    contactPhone: String
    address: String
    isActive: Boolean!
    settings: String
    created_at: String!
    updated_at: String!
    clinics: [Clinic!]!
    subscriptions: [OrganizationSubscription!]!
  }

  type OrganizationSubscription {
    id: ID!
    clientOrgId: String!
    planId: String!
    status: String!
    billingCycle: String!
    currentPeriodStart: String!
    currentPeriodEnd: String!
    stripeCustomerId: String
    stripeSubscriptionId: String
    created_at: String!
    updated_at: String!
    clientOrg: ClientOrganization!
    plan: SubscriptionPlan!
  }

  type SubscriptionPlan {
    id: ID!
    name: String!
    description: String!
    priceMonthly: Float!
    priceYearly: Float!
    maxClinics: Int!
    maxUsers: Int!
    features: String
    isActive: Boolean!
    created_at: String!
    subscriptions: [OrganizationSubscription!]!
  }

  # ========================
  # Type Definitions
  # ========================

  type UserError {
    message: String!
  }

  type User {
    id: ID!
    userProfile: UserProfile
    auditLogs: [AuditLog!]!
    notifications: [Notification!]!
  }

  type UserProfile {
    id: ID!
    role_id: String!
    first_name: String!
    last_name: String!
    email: String!
    phone: String
    phone_country_code: String
    address_line1: String
    address_line2: String
    city: String
    postal_code: String
    country: String
    user_image: String
    clinic_id: String
    clinician_id: String
    patient_id: String
    is_active: Boolean!
    created_at: String!
    updated_at: String!
    client_org_id: String
    user: User!
    role: UserRole!
    clinic: Clinic
    clinician: Clinician
    patient: Patient
    clientOrg: ClientOrganization
  }

  type UserRole {
    id: ID!
    name: String!
    description: String
    created_at: String!
  }

  type AuditLog {
    id: ID!
    userId: String
    action: String!
    resource: String!
    resourceId: String
    details: String!
    ipAddress: String
    created_at: String!
  }

  type Appointment {
    id: ID!
    clinicId: String!
    roomId: String!
    clinicianId: String!
    patientId: String!
    appointmentDate: String!
    appointmentTime: String!
    durationMinutes: Int!
    status: String!
    reason: String!
    notes: String!
    productId: String
    productVariationId: String
    created_at: String!
    updated_at: String!
    clinic: Clinic!
    room: Room!
    clinician: Clinician!
    patient: Patient!
    product: Product
    productVariation: ProductVariation
  }

  type Clinic {
    id: ID!
    name: String!
    address: String!
    phone: String!
    email: String!
    created_at: String!
    clientOrgId: String
    clientOrganization: ClientOrganization
    appointments: [Appointment!]!
    rooms: [Room!]!
    clinicians: [Clinician!]!
  }

  type Clinician {
    id: ID!
    clinicId: String!
    firstName: String!
    lastName: String!
    clinicianType: String!
    email: String!
    phone: String!
    isActive: Boolean!
    created_at: String!
    clinic: Clinic!
    appointments: [Appointment!]!
    availability: [ClinicianAvailability!]!
  }

  type PlaceOfBirth {
    city: String
    country: String
  }

  type Phone {
    countryCode: String!
    number: String!
  }

  type Address {
    line1: String
    line2: String
    city: String
    postalCode: String
    country: String
  }

  type Patient {
    id: ID!
    firstName: String
    lastName: String
    fullName: String
    first_name: String!
    last_name: String!
    title: String
    status: String
    birthSurname: String
    birthName: String
    birthNames: String
    birth_surname: String
    birth_name: String
    birth_names: String
    dob: String
    date_of_birth: String!
    placeOfBirth: PlaceOfBirth
    place_of_birth: PlaceOfBirth
    socialSecurityNumber: String
    social_security_number: String
    gender: String
    sex: String
    email: String!
    googleClientId: String
    google_client_id: String
    paymentReference: String
    payment_reference: String
    phones: [Phone]
    phone: String!
    phone_country_code: String
    occupation: String
    address_structured: Address
    address: String!
    medical_notes: String
    created_at: String!
    updated_at: String
    is_deleted: Boolean!
    appointments: [Appointment!]!
  }

  type Notification {
    id: ID!
    userId: String!
    title: String!
    message: String!
    type: String!
    priority: String!
    isRead: Boolean!
    actionUrl: String
    metadata: String
    created_at: String!
    user: User!
  }

  type Product {
    id: ID!
    categoryId: String!
    subcategoryId: String
    name: String!
    description: String
    productType: String!
    sku: String!
    price: Float
    isActive: Boolean!
    created_at: String!
    category: ProductCategory!
    subcategory: ProductSubcategory
    variations: [ProductVariation!]!
    appointments: [Appointment!]!
  }

  type ProductVariation {
    id: ID!
    productId: String!
    variationName: String!
    sku: String!
    price: Float!
    stockQuantity: Int!
    isActive: Boolean!
    created_at: String!
    product: Product!
    appointments: [Appointment!]!
  }

  # ========================
  # Payload Types
  # ========================

  type AuthPayload {
    userErrors: [UserError!]!
    token: String
    user: User
    userId: ID
  }

  type UserPayload {
    userErrors: [UserError!]!
    user: User
    profile: UserProfile
    success: Boolean
  }

  type AppointmentPayload {
    userErrors: [UserError!]!
    appointment: Appointment
  }

  type ClinicPayload {
    userErrors: [UserError!]!
    clinic: Clinic
    success: Boolean
  }

  type ClinicianPayload {
    userErrors: [UserError!]!
    clinician: Clinician
    success: Boolean
  }

  type LanguagePayload {
    userErrors: [UserError!]!
    language: Language
    success: Boolean
  }

  type ClinicianTypePayload {
    userErrors: [UserError!]!
    clinicianType: ClinicianType
    success: Boolean
  }

  type RoomTypePayload {
    userErrors: [UserError!]!
    roomType: RoomType
    success: Boolean
  }

  type PatientPayload {
    userErrors: [UserError!]!
    patient: Patient
    success: Boolean
  }

  type NotificationPayload {
    userErrors: [UserError!]!
    notification: Notification
  }

  type ProductPayload {
    userErrors: [UserError!]!
    product: Product
    success: Boolean
  }

  type ProductCategoryPayload {
    userErrors: [UserError!]!
    category: ProductCategory
    success: Boolean
  }

  type ProductSubcategoryPayload {
    userErrors: [UserError!]!
    subcategory: ProductSubcategory
    success: Boolean
  }

  type RoomPayload {
    userErrors: [UserError!]!
    room: Room
    success: Boolean
  }

  type AvailabilityPayload {
    userErrors: [UserError!]!
    availability: ClinicianAvailability
    success: Boolean
  }

  type SpacerBlockPayload {
    userErrors: [UserError!]!
    spacerBlock: SpacerBlock
    success: Boolean
  }

  type RoomBlockPayload {
    userErrors: [UserError!]!
    roomBlock: RoomBlock
    success: Boolean
  }

  type RolePayload {
    userErrors: [UserError!]!
    role: UserRole
    roleId: ID
  }
`;