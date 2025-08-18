# 🛒 E-Commerce Database System with PostgreSQL & Node.js

A complete full-stack implementation for learning database management systems (DBMS) and web development. Built with vanilla JavaScript for maximum educational value.

Developed by : **MOHAMMAD MUSA ALI | MUHAMMAD UMER | SAROSH ISHAQ**

## 🚀 Features

### Database Layer
- **6 Normalized PostgreSQL Tables** (Users, Products, Orders, etc.)
- **Complex SQL Queries** with JOINs and transactions
- **Secure Authentication** with password hashing

### Backend API
- **Node.js/Express** RESTful endpoints
- **JWT Authentication** middleware
- **Error Handling** for database operations

### Frontend
- **Pure JavaScript DOM Manipulation**
- **LocalStorage Cart** with DB synchronization
- **Modal-Based UI** (No page reloads)

## 💻 Tech Stack
- **Database:** PostgreSQL 15+
- **Backend:** Node.js 18+, Express 4.x
- **Frontend:** Vanilla JavaScript, CSS3, HTML5

## 📦 Installation

### Prerequisites
- PostgreSQL 15+ ([Install Guide](https://www.postgresql.org/download/))
- Node.js 18+ ([Install Guide](https://nodejs.org/))

### Setup
1. **Clone the repository**
    ```bash
    git clone https://github.com/umer33511/ecommerce-dbms-system.git
    cd ecommerce-dbms-system
2. **Database Setup**
    ```bash
    psql -U postgres -f sql/schema.sql
    psql -U postgres -f sql/seed.sql
3. **Configure Environment**
   ```bash
   Edit.env with your PostgreSQL Credentials

4. **Install Dependencies**
   ```bash
    npm install
5. **Run the Application**
    ```bash
    npm start
Access at: http://localhost:3000

## 📚 Learning Objectives
- Understand relational database design

- Practice SQL query optimization

- Learn REST API development

- Master client-server communication

## 🛠️ Project Structure
<pre>
      ├── sql/
      │   ├── schema.sql       # Database schema
      │   └── seed.sql         # Sample data
      ├── server/              # Node.js backend
      ├── public/              # Frontend
          ├── css/
          ├── js/
          └── test3.html
 </pre>
      
## 🤝 Contribution Guidelines
- Report bugs as GitHub Issues

- Fork & submit Pull Requests

- Keep code style consistent

## 🚑 Troubleshooting
- "Can't connect to PostgreSQL?" → Verify credentials in .env

- "npm install fails?" → Try npm cache clean --force

- "Missing modules?" → Delete node_modules and re-run npm install

## 📜 License
MIT License - See LICENSE file

## 📧 Contact
For educational inquiries: umer33511@gmail.com

Project Link: https://github.com/umer33511/ecommerce-dbms-system
