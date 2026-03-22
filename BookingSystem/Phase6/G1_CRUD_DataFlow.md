# CRUD Data Flow — Booking System Phase6

---

# 1️⃣ CREATE — Resource (POST /api/resources)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (form.js / resources.js)
    participant B as Backend (Express Route)
    participant V as express-validator
    participant L as log.service.js
    participant DB as PostgreSQL

    U->>F: Fill form and click Create
    F->>F: Client-side validation (isResourceNameValid, isResourceDescriptionValid)
    F->>B: POST /api/resources (JSON body)

    B->>V: resourceValidators (name, description, available, price, priceUnit)
    V-->>B: Validation result

    alt Validation fails
        B-->>F: 400 Bad Request { ok: false, errors: [{field, msg}] }
        F-->>U: Show validation error message
    else Validation OK
        B->>DB: INSERT INTO resources VALUES ($1..$5) RETURNING *
        DB-->>B: Result

        alt Duplicate name (pg error 23505)
            B->>L: logEvent "Duplicate resource blocked"
            B-->>F: 409 Conflict { ok: false, error: "Duplicate resource name" }
            F-->>U: Show duplicate error message
        else Insert success
            B->>L: logEvent "Resource created (ID x)"
            B-->>F: 201 Created { ok: true, data: { id, name, ... } }
            F-->>U: Show success message, reload resource list
        end
    end
```

---

# 2️⃣ READ — Resources (GET /api/resources and GET /api/resources/:id)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (resources.js)
    participant B as Backend (Express Route)
    participant DB as PostgreSQL

    Note over U,F: Page load OR after create/update/delete triggers loadResources()

    F->>B: GET /api/resources

    B->>DB: SELECT * FROM resources ORDER BY created_at DESC
    DB-->>B: rows[]

    alt DB error
        B-->>F: 500 Internal Server Error { ok: false, error: "Database error" }
        F-->>U: renderResourceList([]) — empty list shown
    else Success
        B-->>F: 200 OK { ok: true, data: [ ...resources ] }
        F-->>U: Render resource list (name buttons)
    end

    Note over U,F: User clicks a resource in the list → selectResource() called (no extra HTTP request, uses cache)

    U->>F: Click resource in list
    F->>F: Find resource in resourcesCache by ID
    F-->>U: Populate form fields, switch to edit mode

    Note over U,B: READ ONE — only triggered if ID is needed directly

    F->>B: GET /api/resources/:id

    alt Invalid ID (NaN)
        B-->>F: 400 Bad Request { ok: false, error: "Invalid ID" }
        F-->>U: Show error
    else ID valid
        B->>DB: SELECT * FROM resources WHERE id = $1
        DB-->>B: row or empty

        alt Not found
            B-->>F: 404 Not Found { ok: false, error: "Resource not found" }
            F-->>U: Show not found message
        else Found
            B-->>F: 200 OK { ok: true, data: { id, name, ... } }
            F-->>U: Display resource details
        end
    end
```

---

# 3️⃣ UPDATE — Resource (PUT /api/resources/:id)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (form.js / resources.js)
    participant B as Backend (Express Route)
    participant V as express-validator
    participant L as log.service.js
    participant DB as PostgreSQL

    U->>F: Select resource from list, edit fields, click Update
    F->>F: Client-side validation (name + description valid AND at least one field changed)

    alt No resource selected (missing ID)
        F-->>U: Show error "missing resource ID. Select a resource first."
    else ID present
        F->>B: PUT /api/resources/:id (JSON body)

        alt Invalid ID (NaN)
            B-->>F: 400 Bad Request { ok: false, error: "Invalid ID" }
            F-->>U: Show error
        else ID valid
            B->>V: resourceValidators (name, description, available, price, priceUnit)
            V-->>B: Validation result

            alt Validation fails
                B-->>F: 400 Bad Request { ok: false, errors: [{field, msg}] }
                F-->>U: Show validation error message
            else Validation OK
                B->>DB: UPDATE resources SET ... WHERE id = $6 RETURNING *
                DB-->>B: Result

                alt Not found (rowCount = 0)
                    B-->>F: 404 Not Found { ok: false, error: "Resource not found" }
                    F-->>U: Show not found message
                else Duplicate name (pg error 23505)
                    B-->>F: 409 Conflict { ok: false, error: "Duplicate resource name" }
                    F-->>U: Show duplicate error message
                else Update success
                    B->>L: logEvent "Resource updated (ID x)"
                    B-->>F: 200 OK { ok: true, data: { id, name, ... } }
                    F-->>U: Show success message, reload resource list
                end
            end
        end
    end
```

---

# 4️⃣ DELETE — Resource (DELETE /api/resources/:id)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (form.js / resources.js)
    participant B as Backend (Express Route)
    participant L as log.service.js
    participant DB as PostgreSQL

    U->>F: Select resource from list, click Delete

    alt No resource selected (missing ID)
        F-->>U: Show error "missing resource ID. Select a resource first."
    else ID present
        F->>B: DELETE /api/resources/:id (no body)

        alt Invalid ID (NaN)
            B-->>F: 400 Bad Request { ok: false, error: "Invalid ID" }
            F-->>U: Show error
        else ID valid
            B->>DB: DELETE FROM resources WHERE id = $1
            DB-->>B: rowCount

            alt Not found (rowCount = 0)
                B-->>F: 404 Not Found { ok: false, error: "Resource not found" }
                F-->>U: Show not found message
            else Delete success
                B->>L: logEvent "Resource deleted (ID x)"
                B-->>F: 204 No Content (empty body)
                F-->>U: Show success message, reload resource list, reset form to create mode
            end
        end
    end
```
