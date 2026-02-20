# EHC Assessment App — Architecture Documentation

> Visual architecture diagrams for the EHC Client Intake Assessment App.
> All diagrams use [Mermaid](https://mermaid.js.org/) syntax — renderable in GitHub, VS Code, and most markdown viewers.

---

## Table of Contents

1. [System Context Diagram](#1-system-context-diagram)
2. [React Component Hierarchy](#2-react-component-hierarchy)
3. [Navigation State Machine](#3-navigation-state-machine)
4. [Supabase Sync Architecture](#4-supabase-sync-architecture)
5. [Draft Lifecycle & Locking](#5-draft-lifecycle--locking)
6. [Authentication Flow](#6-authentication-flow)
7. [Assessment Creation Workflow](#7-assessment-creation-workflow)
8. [Conflict Resolution Sequence](#8-conflict-resolution-sequence)
9. [PDF Email Delivery Sequence](#9-pdf-email-delivery-sequence)
10. [Encryption & Key Management](#10-encryption--key-management)
11. [IndexedDB Schema](#11-indexeddb-schema)

---

## 1. System Context Diagram

Shows the EHC Assessment App and all external systems it integrates with.

```mermaid
C4Context
    title EHC Assessment App — System Context

    Person(staff, "EHC Staff", "Nurse / Aide conducting home visits")

    System(ehcApp, "EHC Assessment PWA", "React 19 + TypeScript<br/>Offline-capable tablet app")

    System_Ext(supabase, "Supabase", "Postgres + Auth + Realtime<br/>Multi-device sync backend")
    System_Ext(google, "Google APIs", "OAuth 2.0 + Sheets API v4<br/>Login + data sync")
    System_Ext(resend, "Resend", "Email delivery API<br/>PDF attachments")
    System_Ext(netlify, "Netlify", "Static hosting + Functions<br/>CDN + serverless")

    Rel(staff, ehcApp, "Uses on tablet", "HTTPS / offline")
    Rel(ehcApp, supabase, "Sync drafts, audit logs", "HTTPS + WebSocket")
    Rel(ehcApp, google, "Login + Sheets sync", "HTTPS / OAuth 2.0")
    Rel(ehcApp, resend, "Send PDF emails", "HTTPS via Netlify Function")
    Rel(ehcApp, netlify, "Hosted on", "HTTPS / CDN")
```

### Simplified Integration Map

```mermaid
flowchart LR
    subgraph Client ["Browser (PWA)"]
        App["EHC Assessment App"]
        SW["Service Worker<br/>(Workbox precache)"]
        LS["localStorage<br/>(AES-GCM encrypted)"]
        IDB["IndexedDB v7<br/>(7 stores)"]
        CK["ehc-crypto-keys<br/>(CryptoKey objects)"]
    end

    subgraph Supabase ["Supabase Cloud"]
        PG["Postgres<br/>(RLS + JSONB)"]
        Auth["Supabase Auth<br/>(Google OAuth)"]
        RT["Realtime<br/>(postgres_changes)"]
    end

    subgraph Google ["Google Cloud"]
        GIS["Google Identity<br/>Services (GIS)"]
        Sheets["Sheets API v4"]
    end

    subgraph Netlify ["Netlify"]
        CDN["CDN<br/>(Static Assets)"]
        Fn["Netlify Function<br/>(email.mts)"]
    end

    Resend["Resend API"]

    App <-->|"500ms debounce"| LS
    App <-->|"drafts, audit,<br/>config, queue"| IDB
    LS --- CK
    IDB --- CK

    IDB -->|"3s debounce<br/>(if online)"| PG
    PG -->|"WebSocket"| RT
    RT -->|"live updates"| App

    App -->|"OAuth login"| Auth
    App -->|"OAuth login<br/>(fallback)"| GIS
    App -->|"PHI-sanitized<br/>sync"| Sheets

    App -->|"PDF + metadata"| Fn
    Fn -->|"REST API"| Resend

    CDN -->|"HTTPS"| App
```

---

## 2. React Component Hierarchy

```mermaid
flowchart TD
    App["<b>App.tsx</b><br/>Root: view routing + auth gate"]

    subgraph Auth ["Auth Layer"]
        Login["LoginScreen<br/>(Google OAuth)"]
    end

    subgraph Views ["Main Views"]
        Dash["Dashboard<br/>(4 cards)"]
        AW["AssessmentWizard<br/>(7 steps)"]
        SCW["ServiceContractWizard<br/>(7 steps)"]
        DM["DraftManager<br/>(search + filters)"]
        Settings["SettingsScreen<br/>(6 sections)"]
    end

    subgraph WizardInternals ["Wizard Internals"]
        WS["WizardShell"]
        PB["ProgressBar"]
        EB["ErrorBoundary"]
    end

    subgraph AssessmentForms ["Assessment Forms (7)"]
        F1["ClientHelpList"]
        F2["ClientHistory"]
        F3["ClientAssessment"]
        F4["HomeSafetyChecklist"]
        F5["MedicationList"]
        F6["ConsentSignature"]
        F7a["ReviewSubmit"]
    end

    subgraph ContractForms ["Contract Forms (7)"]
        CF1["CustomerInfo"]
        CF2["TermsConditions"]
        CF3["ConsumerRights"]
        CF4["DirectCareWorker"]
        CF5["TransportationRequest"]
        CF6["CustomerPacket"]
        CF7["ReviewSubmit"]
    end

    subgraph SharedUI ["Shared UI Components"]
        TC["ToggleCard /<br/>ToggleCardGroup"]
        CC["CategoryCard"]
        SP["SignaturePad"]
        IP["InitialsPad"]
        TT["ThemeToggle"]
        ECM["EmailComposeModal"]
        CRM["ConflictResolutionModal"]
        CD["ConfirmDialog"]
        AC["AddressAutocomplete"]
        HM["HelpModal"]
    end

    subgraph Hooks ["Custom Hooks"]
        H1["useAutoSave"]
        H2["useFormWizard"]
        H3["useStepValidation"]
        H4["useIdleTimeout"]
        H5["useDarkMode"]
        H6["useFocusTrap"]
        H7["useOnlineStatus"]
        H8["useSupabaseAuth"]
        H9["useSupabaseSync"]
        H10["useSupabaseDrafts"]
        H11["useDraftLock"]
        H12["useSheetsSync"]
    end

    App --> Login
    App --> Dash
    App --> AW
    App --> SCW
    App --> DM
    App --> Settings

    AW --> WS
    AW --> EB
    SCW --> WS
    SCW --> EB
    WS --> PB

    AW --> F1 & F2 & F3 & F4 & F5 & F6 & F7a
    SCW --> CF1 & CF2 & CF3 & CF4 & CF5 & CF6 & CF7

    F3 --> TC
    F4 --> TC
    F6 --> SP
    CF2 --> IP
    CF3 --> SP
    CF4 --> SP
    CF5 --> SP
    CF6 --> SP

    AW --> H1 & H2 & H3 & H9 & H11
    SCW --> H1 & H2 & H3 & H9 & H11
    App --> H4 & H5 & H8

    AW --> CRM
    SCW --> CRM
    AW --> ECM
    SCW --> ECM
```

---

## 3. Navigation State Machine

```mermaid
stateDiagram-v2
    [*] --> LoginScreen : requireAuth && !authUser
    LoginScreen --> Dashboard : successful login

    [*] --> Dashboard : !requireAuth || authUser

    Dashboard --> Assessment : "New Assessment" card
    Dashboard --> ServiceContract : "Service Contract" card
    Dashboard --> DraftManager : "Resume Draft" card
    Dashboard --> Settings : "Settings" card

    Assessment --> Dashboard : Home (Save Draft & Exit)
    Assessment --> Dashboard : Home (Discard & Exit)
    Assessment --> ServiceContract : "Continue to Contract"\n(with prefill data)

    ServiceContract --> Dashboard : Home (Save Draft & Exit)
    ServiceContract --> Dashboard : Home (Discard & Exit)

    DraftManager --> Assessment : resume assessment draft
    DraftManager --> ServiceContract : resume contract draft
    DraftManager --> Dashboard : Home button

    Settings --> Dashboard : Home button

    Dashboard --> LoginScreen : idle timeout / session expiry

    note right of Assessment
        draftId?: string
        resumeStep?: number
    end note

    note right of ServiceContract
        draftId?: string
        prefillFrom?: AssessmentFormData
        resumeStep?: number
        linkedAssessmentId?: string
    end note
```

---

## 4. Supabase Sync Architecture

### Local-First Data Flow

```mermaid
flowchart TD
    subgraph UserAction ["User Action"]
        Edit["User edits form field"]
    end

    subgraph LocalSave ["Local Save (500ms)"]
        UD["updateData(partial)"]
        Debounce1["500ms debounce timer"]
        Encrypt["AES-GCM encrypt"]
        LSWrite["localStorage.setItem()"]
        Callback["onAfterSave(data)"]
    end

    subgraph RemoteSync ["Remote Sync (3s)"]
        Schedule["scheduleDraftSync(draft)"]
        OnlineCheck{"navigator.onLine?"}
        Queue["IndexedDB<br/>supabaseSyncQueue"]
        Debounce2["3s debounce timer"]
        Upsert["upsertRemoteDraft()"]
    end

    subgraph Supabase ["Supabase Postgres"]
        VersionCheck{"version match?"}
        Write["UPDATE drafts<br/>SET form_data, version++"]
        Conflict["Return null<br/>(conflict detected)"]
    end

    subgraph Resolution ["Conflict Resolution"]
        Modal["ConflictResolutionModal"]
        KeepMine["forceOverwrite: true"]
        UseTheirs["fetchRemoteDraft()<br/>→ reload local"]
    end

    Edit --> UD
    UD --> Debounce1
    Debounce1 --> Encrypt
    Encrypt --> LSWrite
    LSWrite --> Callback
    Callback --> Schedule

    Schedule --> OnlineCheck
    OnlineCheck -->|"Yes"| Debounce2
    OnlineCheck -->|"No"| Queue
    Queue -->|"on reconnect"| Debounce2

    Debounce2 --> Upsert
    Upsert --> VersionCheck
    VersionCheck -->|"Match"| Write
    VersionCheck -->|"Mismatch"| Conflict

    Conflict --> Modal
    Modal -->|"Keep Mine"| KeepMine --> Write
    Modal -->|"Use Theirs"| UseTheirs
    Modal -->|"Cancel"| Schedule

    style LocalSave fill:#e8f5e9,stroke:#4caf50
    style RemoteSync fill:#e3f2fd,stroke:#2196f3
    style Resolution fill:#fff3e0,stroke:#ff9800
```

### Sync State Diagram

```mermaid
stateDiagram-v2
    [*] --> idle : init

    idle --> saving : user edits form
    saving --> idle : localStorage saved (500ms)

    idle --> syncing : 3s debounce fires
    syncing --> synced : upsert success
    syncing --> conflict : version mismatch
    syncing --> error : network/server error
    syncing --> offline : navigator.onLine = false

    conflict --> syncing : "Keep Mine" (forceOverwrite)
    conflict --> idle : "Use Theirs" (reload remote)
    conflict --> idle : "Cancel" (dismiss)

    error --> syncing : auto-retry (next edit)
    offline --> queued : add to supabaseSyncQueue
    queued --> syncing : back online (drain queue)

    synced --> idle : ready for next edit

    note right of syncing
        status: 'syncing'
        Shows spinner in UI
    end note

    note right of conflict
        ConflictResolutionModal
        shows local vs remote timestamps
    end note
```

### Realtime Subscription Flow

```mermaid
sequenceDiagram
    participant Device1 as Device A (editing)
    participant IDB as IndexedDB
    participant PG as Supabase Postgres
    participant RT as Realtime Channel
    participant Device2 as Device B (viewing dashboard)

    Note over Device1,Device2: Both subscribed to drafts-org-{orgId}

    Device1->>IDB: save draft (500ms debounce)
    Device1->>PG: upsertRemoteDraft() (3s debounce)
    PG->>PG: UPDATE drafts SET form_data, version++

    PG->>RT: postgres_changes event (UPDATE)
    RT->>Device2: payload: { new: updatedDraft }
    Device2->>Device2: update draft list UI
    Note over Device2: Live refresh — no polling needed
```

---

## 5. Draft Lifecycle & Locking

### Draft State Machine

```mermaid
stateDiagram-v2
    [*] --> New : "New Assessment" / "New Contract"

    New --> Editing : auto-save on first edit
    Editing --> Saved : debounce fires (500ms)
    Saved --> Editing : user makes another edit
    Saved --> Synced : Supabase upsert success (3s)

    Synced --> Editing : user resumes editing
    Synced --> Locked : another device opens draft

    Editing --> Paused : user clicks Home
    Paused --> Dashboard_Choice : ConfirmDialog shown

    Dashboard_Choice --> Saved : "Save Draft & Exit"
    Dashboard_Choice --> Deleted_Local : "Discard & Exit"
    Dashboard_Choice --> Editing : "Cancel"

    Saved --> Resumed : user selects from DraftManager
    Synced --> Resumed : user selects from any device
    Resumed --> Editing : draft loaded + decrypted

    Editing --> Completed : "Submit" on ReviewSubmit step
    Completed --> PDF : generate PDF
    Completed --> Email : email PDF
    Completed --> Contract : "Continue to Contract" (assessment only)

    note right of Locked
        30-min auto-expiry
        5-min renewal interval
        Lock indicator shown
    end note
```

### Draft Lock Sequence

```mermaid
sequenceDiagram
    participant D1 as Device A
    participant PG as Postgres
    participant D2 as Device B

    Note over D1,D2: Device A opens draft for editing

    D1->>PG: acquire_draft_lock(draftId, userId, deviceId)
    PG->>PG: SELECT ... FOR UPDATE (atomic)
    PG-->>D1: true (lock acquired)
    D1->>D1: setLocked(true), start 5-min renewal timer

    loop Every 5 minutes
        D1->>PG: acquire_draft_lock(draftId, userId, deviceId)
        PG-->>D1: true (renewed)
    end

    Note over D2: Device B tries to open same draft

    D2->>PG: acquire_draft_lock(draftId, userId2, deviceId2)
    PG->>PG: Check: locked_at > now() - 30min?
    PG-->>D2: false (locked by Device A)
    D2->>PG: getDraftLockInfo(draftId)
    PG-->>D2: { lockedBy, lockedAt, lockDeviceId }
    D2->>D2: Show "Locked by [name]" banner

    Note over D1: Device A closes wizard (normal exit)

    D1->>PG: release_draft_lock(draftId, userId)
    PG-->>D1: success
    D1->>D1: clearInterval (stop renewal)

    Note over D1: If tab closes unexpectedly
    D1->>PG: beforeunload → release_draft_lock() (fire-and-forget)
```

---

## 6. Authentication Flow

### Auth Decision Tree

```mermaid
flowchart TD
    Start["App.tsx mounts"]
    Check{"isSupabaseConfigured()?"}

    subgraph SupabasePath ["Supabase Auth Path"]
        SB1["useSupabaseAuth()"]
        SB2["supabase.auth.getSession()"]
        SB3["onAuthStateChange listener"]
        SB4["Map session → AuthUser"]
        SB5["Fetch profile from profiles table"]
    end

    subgraph GISPath ["Google Identity Services Path (Fallback)"]
        GIS1["initGoogleSignIn()"]
        GIS2["Render Google button"]
        GIS3["OAuth popup → JWT credential"]
        GIS4["Parse JWT (jose library)"]
        GIS5["sessionStorage → ehc-auth-user"]
    end

    subgraph Login ["LoginScreen"]
        LoginBtn["Google Sign-In button"]
        SupaLogin["supabase.auth.signInWithOAuth(google)"]
        GISLogin["Google Identity Services popup"]
    end

    subgraph Session ["Session Management"]
        AuthUser["AuthUser { email, name, picture, loginTime }"]
        Idle["useIdleTimeout (configurable)"]
        MaxSession["8-hour max session"]
        Logout["Clear session → LoginScreen"]
    end

    Start --> Check
    Check -->|"Yes (env vars set)"| SB1
    Check -->|"No (env vars missing)"| GIS1

    SB1 --> SB2
    SB2 --> SB3
    SB3 --> SB4
    SB4 --> SB5
    SB5 --> AuthUser

    GIS1 --> GIS2
    GIS2 --> GIS3
    GIS3 --> GIS4
    GIS4 --> GIS5
    GIS5 --> AuthUser

    LoginBtn -->|"Supabase configured"| SupaLogin
    LoginBtn -->|"GIS fallback"| GISLogin

    AuthUser --> Idle
    AuthUser --> MaxSession
    Idle -->|"timeout"| Logout
    MaxSession -->|"8 hours"| Logout

    style SupabasePath fill:#e8f5e9,stroke:#4caf50
    style GISPath fill:#fff3e0,stroke:#ff9800
```

---

## 7. Assessment Creation Workflow

End-to-end workflow from starting an assessment through PDF delivery.

```mermaid
sequenceDiagram
    actor Staff as EHC Staff
    participant Dash as Dashboard
    participant Wizard as AssessmentWizard
    participant Auto as useAutoSave
    participant LS as localStorage
    participant IDB as IndexedDB
    participant Sync as useSupabaseSync
    participant PG as Supabase Postgres
    participant PDF as jsPDF
    participant Email as EmailComposeModal
    participant Fn as Netlify Function
    participant Resend as Resend API

    Staff->>Dash: Click "New Assessment"
    Dash->>Wizard: navigate({ screen: 'assessment' })
    Wizard->>Auto: init (generate storage key)
    Auto->>LS: Check for existing data
    Auto-->>Wizard: isLoading: false, empty form

    Note over Wizard: Step 1: Client Help List
    Staff->>Wizard: Fill in client name, DOB, contacts
    Wizard->>Auto: updateData(partial)
    Auto->>Auto: 500ms debounce
    Auto->>LS: AES-GCM encrypt → localStorage

    Auto->>Sync: onAfterSave → scheduleDraftSync()
    Sync->>Sync: 3s debounce
    Sync->>PG: upsertRemoteDraft()

    Note over Wizard: Steps 2-5: History, Assessment, Safety, Meds
    Staff->>Wizard: Navigate through steps, fill forms
    Wizard->>Auto: updateData() on each change

    Note over Wizard: Step 6: Consent & Signatures
    Staff->>Wizard: Acknowledge 4 consent checkboxes
    Staff->>Wizard: Draw signature on SignaturePad
    Wizard->>Auto: Save signature data (base64)

    Note over Wizard: Step 7: Review & Submit
    Staff->>Wizard: Click "Generate PDF"
    Wizard->>PDF: buildAssessmentPdf(formData)
    PDF-->>Wizard: jsPDF document object
    Wizard->>Wizard: doc.save('assessment.pdf')

    Staff->>Wizard: Click "Email PDF"
    Wizard->>Email: Open EmailComposeModal
    Staff->>Email: Enter recipient, review template
    Email->>Fn: POST /api/email (PDF base64 + metadata)
    Fn->>Fn: Validate + rate limit (5/min/IP)
    Fn->>Resend: POST /emails (branded HTML + attachment)
    Resend-->>Fn: { id: messageId }
    Fn-->>Email: { ok: true }
    Email->>IDB: logAudit('email_sent')

    Staff->>Wizard: Click "Continue to Contract"
    Wizard->>Wizard: prefill(assessmentData) → contractData
    Wizard->>Dash: navigate({ screen: 'serviceContract', prefillFrom })
```

---

## 8. Conflict Resolution Sequence

Detailed flow when two devices edit the same draft.

```mermaid
sequenceDiagram
    participant A as Device A (editing)
    participant IDB_A as IndexedDB (A)
    participant PG as Supabase Postgres
    participant IDB_B as IndexedDB (B)
    participant B as Device B (also editing)
    participant Modal as ConflictResolutionModal

    Note over A,B: Both devices have draft at version 3

    A->>IDB_A: save locally (500ms)
    B->>IDB_B: save locally (500ms)

    A->>PG: upsertRemoteDraft(data, version: 3)
    PG->>PG: version matches → UPDATE, version → 4
    PG-->>A: success { version: 4 }
    A->>IDB_A: update remoteVersion: 4

    B->>PG: upsertRemoteDraft(data, version: 3)
    PG->>PG: version 3 ≠ current 4 → MISMATCH
    PG-->>B: null (conflict)

    B->>PG: fetchRemoteDraft(draftId)
    PG-->>B: remoteDraft { version: 4, lastModified }

    B->>Modal: Show conflict UI
    Note over Modal: "Your version: 2:34 PM<br/>Server version: 2:35 PM<br/>[Keep Mine] [Use Theirs] [Cancel]"

    alt Keep Mine
        B->>PG: upsertRemoteDraft(localData, { forceOverwrite: true })
        PG->>PG: UPDATE (skip version guard), version → 5
        PG-->>B: success { version: 5 }
        B->>IDB_B: update remoteVersion: 5
    else Use Theirs
        B->>PG: fetchRemoteDraft(draftId)
        PG-->>B: remoteDraft { formData, version: 4 }
        B->>IDB_B: saveDraft(remoteDraft)
        B->>B: reload wizard with remote data
    else Cancel
        B->>B: dismiss modal, keep editing locally
        Note over B: Next save will retry sync
    end
```

---

## 9. PDF Email Delivery Sequence

```mermaid
sequenceDiagram
    participant User as Staff
    participant ECM as EmailComposeModal
    participant API as emailApi.ts
    participant Fn as Netlify Function<br/>(email.mts)
    participant RL as Rate Limiter<br/>(in-memory)
    participant Resend as Resend API
    participant Audit as auditLog.ts

    User->>ECM: Click "Email PDF" in wizard
    ECM->>ECM: resolveTemplate(type, data)
    Note over ECM: {clientName} → "John Doe"<br/>{date} → "2026-02-20"<br/>{staffName} → "Jane Smith"

    ECM->>ECM: Pre-fill subject, body, CC from config
    User->>ECM: Review/edit, click "Send"

    ECM->>API: sendPdfEmail({ to, cc, subject, body, pdfBlob })
    API->>API: blobToBase64(pdfBlob)
    Note over API: Max ~4MB PDF (~5.5MB base64)

    API->>Fn: POST /api/email<br/>{ to, cc, subject, body, pdfBase64, filename }

    Fn->>RL: checkRateLimit(clientIP)
    alt Rate limit exceeded
        RL-->>Fn: 429 Too Many Requests
        Fn-->>API: { ok: false, error: 'Rate limit exceeded' }
        API->>Audit: logAudit('email_failed')
    else Within limit
        RL-->>Fn: OK

        Fn->>Fn: Validate inputs
        Note over Fn: subject ≤ 1000 chars<br/>body ≤ 50,000 chars<br/>base64 ≤ 5.5MB

        Fn->>Fn: buildHtmlEmail(body)
        Note over Fn: Table layout (600px)<br/>#1a3a4a header<br/>#d4912a accent<br/>escapeHtml() for XSS

        Fn->>Resend: POST /emails<br/>{ from, to, cc, subject, html, attachments }
        Resend-->>Fn: { id: msg_xxx }
        Fn-->>API: { ok: true, messageId }
        API->>Audit: logAudit('email_sent', { draftId, documentType })
        Note over Audit: Recipient email redacted in audit
        API-->>ECM: Success
        ECM->>ECM: Show success toast, close modal
    end
```

---

## 10. Encryption & Key Management

### Key Hierarchy

```mermaid
flowchart TD
    subgraph KeyDB ["IndexedDB: ehc-crypto-keys"]
        PHI["<b>phi</b> key<br/>AES-GCM 256-bit<br/>non-extractable"]
        CRED["<b>credential</b> key<br/>AES-GCM 256-bit<br/>non-extractable"]
        HMAC["<b>audit-hmac</b> key<br/>HMAC-SHA256<br/>non-extractable"]
    end

    subgraph EncryptedData ["What Each Key Protects"]
        subgraph PHI_Data ["PHI Key Scope"]
            LS["localStorage<br/>Active form data<br/>(ENC:iv+ciphertext)"]
            Drafts["IndexedDB drafts<br/>DraftRecord.encryptedData<br/>(ENC:iv+ciphertext)"]
        end

        subgraph CRED_Data ["Credential Key Scope"]
            OAuth["Google OAuth tokens"]
            SheetsConfig["Sheets config<br/>(client ID, sheet IDs)"]
        end

        subgraph HMAC_Data ["HMAC Key Scope"]
            AuditLogs["Audit log entries<br/>(tamper-evident hash)"]
        end
    end

    PHI --> LS
    PHI --> Drafts
    CRED --> OAuth
    CRED --> SheetsConfig
    HMAC --> AuditLogs

    style PHI fill:#ffcdd2,stroke:#c62828
    style CRED fill:#c8e6c9,stroke:#2e7d32
    style HMAC fill:#bbdefb,stroke:#1565c0
```

### Encryption Format

```mermaid
flowchart LR
    Plain["Plaintext<br/>(form JSON)"]
    -->|"crypto.subtle.encrypt()"| Cipher["IV (12 bytes) + Ciphertext"]
    -->|"base64 encode"| Stored["<b>ENC:</b>base64string"]

    Stored -->|"detect ENC: prefix"| Decode["base64 decode"]
    -->|"split IV + ciphertext"| Decrypt["crypto.subtle.decrypt()"]
    -->|"JSON.parse()"| Plain2["Plaintext<br/>(form JSON)"]

    style Plain fill:#e8f5e9
    style Stored fill:#fff3e0
    style Plain2 fill:#e8f5e9
```

---

## 11. IndexedDB Schema

```mermaid
erDiagram
    DRAFTS {
        string id PK "crypto.randomUUID()"
        string type "assessment | serviceContract"
        string clientName "for display"
        string encryptedData "ENC:base64 (AES-GCM)"
        string lastModified "ISO timestamp"
        number remoteVersion "Supabase version"
        string supabaseId "remote draft ID"
    }

    AUDIT_LOGS {
        string id PK "crypto.randomUUID()"
        string action "27 action types"
        string userId "email or system"
        string draftId FK "optional"
        string timestamp "ISO timestamp"
        string details "JSON metadata"
        string hmac "HMAC-SHA256 hash"
    }

    SUPABASE_SYNC_QUEUE {
        string id PK "auto-increment"
        string draftId FK "target draft"
        string action "upsert | delete"
        string timestamp "ISO timestamp"
    }

    SHEETS_CONFIG {
        string id PK "singleton"
        string encryptedData "OAuth tokens (AES-GCM)"
        string spreadsheetId "Google Sheets ID"
    }

    AUTH_CONFIG {
        string id PK "singleton"
        boolean requireAuth "enable login gate"
        string allowedEmails "JSON array"
        number idleTimeoutMinutes "5/10/15/30"
    }

    EMAIL_CONFIG {
        string id PK "singleton"
        string assessmentSubject "template"
        string assessmentBody "template"
        string contractSubject "template"
        string contractBody "template"
        string defaultCc "email"
        string signature "appended text"
        boolean htmlEnabled "branded HTML"
    }

    SYNC_QUEUE {
        string id PK "auto-increment"
        string data "legacy Sheets queue"
    }

    DRAFTS ||--o{ AUDIT_LOGS : "draftId"
    DRAFTS ||--o{ SUPABASE_SYNC_QUEUE : "draftId"
```

### Supabase Postgres Schema

```mermaid
erDiagram
    ORGANIZATIONS {
        uuid id PK
        text name
        text slug UK
        jsonb settings
        timestamptz created_at
    }

    PROFILES {
        uuid id PK "= auth.uid()"
        uuid org_id FK
        text email
        text full_name
        text avatar_url
        text role "owner | admin | staff"
        timestamptz created_at
    }

    DRAFTS {
        uuid id PK
        uuid org_id FK
        text user_id FK
        text type "assessment | serviceContract"
        text client_name
        jsonb form_data "full form state"
        integer version "auto-increment trigger"
        text locked_by "user_id or null"
        timestamptz locked_at
        text lock_device_id
        timestamptz created_at
        timestamptz updated_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid org_id FK
        text user_email
        text action "27+ action types"
        text draft_id FK
        jsonb details
        timestamptz created_at
    }

    APP_CONFIG {
        uuid id PK
        uuid org_id FK UK
        jsonb config "per-org settings"
        timestamptz updated_at
    }

    ORGANIZATIONS ||--o{ PROFILES : "org_id"
    ORGANIZATIONS ||--o{ DRAFTS : "org_id"
    ORGANIZATIONS ||--o{ AUDIT_LOGS : "org_id"
    ORGANIZATIONS ||--|| APP_CONFIG : "org_id"
    PROFILES ||--o{ DRAFTS : "user_id"
```

---

## Appendix: Key Timing Constants

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| `SAVE_DEBOUNCE_MS` | 500ms | useAutoSave.ts | Local save debounce |
| `REMOTE_SYNC_DEBOUNCE_MS` | 3000ms | useSupabaseSync.ts | Supabase push debounce |
| `LOCK_RENEWAL_INTERVAL_MS` | 5 min | useDraftLock.ts | Lock heartbeat |
| Lock expiry | 30 min | schema.sql | Server-side lock TTL |
| Idle timeout | 5/10/15/30 min | useIdleTimeout.ts | Configurable in Settings |
| Session max | 8 hours | App.tsx | Max login duration |
| Rate limit | 5/min/IP | email.mts | Email send rate |
| GIS token | ~1 hour | Google API | Token lifetime (no refresh) |
| Debounce (address) | 300ms | AddressAutocomplete | Geocoding API calls |
| Fetch timeout | 3-30s | fetchWithTimeout.ts | Network request timeout |

---

*Generated 2026-02-20 — Session 41: Supabase multi-device sync documentation*
