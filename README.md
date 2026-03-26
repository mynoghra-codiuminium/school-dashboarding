# EduSys — Production Version
## Clean deployment. No sample data. Add your own school's data.

---

### Quick Start
1. Run `INSTALL.bat` (first time only)
2. Run `START.bat`
3. Login → Change all default passwords immediately

### Default Login Credentials
| Role    | Email                  | Password     | ⚠ Change After Login |
|---------|------------------------|--------------|----------------------|
| Admin   | admin@school.edu       | Admin@123    | YES — required       |
| Teacher | teacher@school.edu     | Teacher@123  | YES — required       |
| Staff   | staff@school.edu       | Staff@123    | YES — required       |

---

### 4 Account Types

| Role        | Access                                              |
|-------------|-----------------------------------------------------|
| **Admin**   | Full access — all pages, user management, graduation |
| **Teacher** | Students, classes, grades, SHS modules              |
| **Staff**   | Students, fees, reports, events, announcements      |
| **Student** | Personal portal — own grades, immersion, fees       |

---

### Setup Workflow (After First Login)

**Step 1 — Add your data:**
- Students → Add students or use batch Excel upload
- Teachers → Add teaching staff
- Classes → Set up class sections
- Subjects → Add subject catalogue

**Step 2 — Create student accounts:**
- Go to **User Management → Bulk Create Student Accounts**
- This auto-creates login accounts for all enrolled students
- Default password = last 6 digits of LRN
- Students are required to change password on first login

**Step 3 — End of school year (Graduation):**
- Go to **Graduation & Promotion**
- Preview which Grade 12 students will graduate
- Choose to Archive (keep records) or Delete (free database)
- Run — Grade 12 graduates, Grade 11 → Grade 12, school year updates

---

### Full Database Reset
Run `RESET_DATA.bat` and type `RESET` to confirm.
This wipes ALL data and recreates only the 3 default accounts.
