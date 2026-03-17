# Smart Rural Patta: Digital Land Approval Workflow System

## 🌟 Premium Problem Statement (Rural Governance)
Many rural citizens face difficulties in obtaining land ownership documents such as **Patta**. The current process usually requires multiple visits to government offices like the **Village Administrative Officer (VAO)**, **Survey Department**, and **Tahsildar office**. Due to manual processing, lack of transparency, and inefficient communication, the process often takes several weeks or even months. 

Namma village makkalukku (Our rural people) land documents get pannedrathu periya problem. Correct-ana documents irundhalum, delay aagudhu. Transparency illa. 

This project proposes a **Smart Rural Land Patta Approval Workflow System** that digitizes the entire application process. Citizens can apply online, track status "Amazon-style," and the system automatically routes the file to the right officer using a **Dynamic Rule-Based Engine**.

---

## 🧠 Core Workflow Pattern
1.  **Citizen Apply Patta** (Input Data & Documents)
2.  **VAO Verification** (Field check & Document validation)
3.  **Surveyor Inspection** (Land boundary measurement)
4.  **Tahsildar Approval** (Final Sanction)
5.  **Patta Issued** (Digital Certificate Generation)

---

## 🚀 Premium Features
- **Amazon-style Tracker**: Visual timeline for citizens to see exactly which officer's desk their file is on.
- **Dynamic Rule Engine**: System automatically decides next steps. 
  - *Example*: If `land_area > 5 acres`, it triggers an extra Senior Surveyor inspection.
- **Audit Logs**: Every move is recorded. "Who approved what and when."
- **Role-Based Access (RBAC)**: Distinct dashboards for Citizen, VAO, Surveyor, and Tahsildar.
- **Premium UI**: Dark-mode glassmorphism design for a state-of-the-art government platform feel.

---

## 🛠 Tech Stack
- **Frontend**: HTML5, Vanilla CSS3 (Custom Grid), Vanilla JavaScript.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose for Schema management).
- **Visualization**: Chart.js for Analytics.

---

## 🗄 Database Design (Mongoose)
- **Applications**: `id`, `citizen_name`, `survey_no`, `area`, `status`, `current_step`.
- **Workflow**: `id`, `name`, `steps[]`, `rules[]`.
- **Logs**: `application_id`, `officer_id`, `action`, `timestamp`, `rule_evaluated`.
