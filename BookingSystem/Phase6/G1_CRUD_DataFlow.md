# CRUD Data Flow — Booking System Phase6

---

# 1️⃣ CREATE — Resource (POST /api/resources)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (form.js and resources.js)
    participant B as Backend (Express Route)
    participant V as express-validator
    participant S as Resource Service
    participant DB as PostgreSQL

    U->>F: Submit form
    F->>F: Client-side validation
    F->>B: POST /api/resources (JSON)

    B->>V: Validate request
    V-->>B: Validation result

    alt Validation fails
        B-->>F: 400 Bad Request + errors[]
        F-->>U: Show validation message
    else Validation OK
        B->>S: create Resource(data)
        S->>DB: INSERT INTO resources
        DB-->>S: Result / Duplicate error

        alt Duplicate
            S-->>B: Duplicate detected
            B-->>F: 409 Conflict
            F-->>U: Show duplicate message
        else Success
            S-->>B: Created resource
            B-->>F: 201 Created
            F-->>U: Show success message
        end
    end
```

---

# 2️⃣ READ — Resource (Sequence Diagram)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (resources.js)
    participant B as Backend (Express Route)
    participant DB as PostgreSQL

    U->>F: Page loads / list refreshes
    F->>B: GET /api/resources

    B->>DB: SELECT * FROM resources ORDER BY created_at DESC
    DB-->>B: rows[]

    alt DB error
        B-->>F: 500 Internal Server Error
        F-->>U: Show empty list
    else Success
        B-->>F: 200 OK + data[]
        F-->>U: Render resource list

        U->>F: Click a resource
        F->>B: GET /api/resources/:id

        alt Not found
            B-->>F: 404 Not Found
            F-->>U: Show not found message
        else Found
            B-->>F: 200 OK + data
            F-->>U: Populate form, switch to edit mode
        end
    end
```

---

# 3️⃣ UPDATE — Resource (Sequence Diagram)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (form.js and resources.js)
    participant B as Backend (Express Route)
    participant V as express-validator
    participant DB as PostgreSQL

    U->>F: Edit fields and click Update
    F->>F: Client-side validation
    F->>B: PUT /api/resources/:id (JSON)

    B->>V: Validate request
    V-->>B: Validation result

    alt Validation fails
        B-->>F: 400 Bad Request + errors[]
        F-->>U: Show validation message
    else Validation OK
        B->>DB: UPDATE resources WHERE id = $6 RETURNING *
        DB-->>B: Result

        alt Not found
            B-->>F: 404 Not Found
            F-->>U: Show not found message
        else Duplicate
            B-->>F: 409 Conflict
            F-->>U: Show duplicate message
        else Success
            B-->>F: 200 OK + updated data
            F-->>U: Show success message
        end
    end
```

---

# 4️⃣ DELETE — Resource (Sequence Diagram)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (form.js and resources.js)
    participant B as Backend (Express Route)
    participant DB as PostgreSQL

    U->>F: Select resource and click Delete
    F->>B: DELETE /api/resources/:id

    B->>DB: DELETE FROM resources WHERE id = $1
    DB-->>B: rowCount

    alt Not found
        B-->>F: 404 Not Found
        F-->>U: Show not found message
    else Success
        B-->>F: 204 No Content
        F-->>U: Show success message, reload list
    end
```
