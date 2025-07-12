<div align="center">

# 🏠 PayNode Server

**Professional Payroll & Payment Management API**

_Connecting businesses with secure payroll and payment automation through modern technology_

[![Server API](https://img.shields.io/badge/📡_API-Server-10b981?style=for-the-badge&logo=vercel)](https://repair-right-server.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting-ffca28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47a248?style=for-the-badge&logo=mongodb)](https://mongodb.com/)

![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square)
![License](https://img.shields.io/badge/Status-Production-green?style=flat-square)
![Build](https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square)
![Dependencies](https://img.shields.io/badge/Dependencies-Up%20to%20Date-success?style=flat-square)

</div>

---

## 📖 **About PayNode Server**

PayNode Server is a robust backend API for payroll and payment management, designed for businesses to automate employee payments, manage roles, and track payroll efficiently. Built with Node.js, Express, MongoDB, and Firebase, it provides secure authentication, role-based access, and real-time updates.

### 🎯 **Key Objectives**

- **💼 Businesses**: Automate payroll and payment processes
- **👨‍💻 Employees**: Track payments and payroll status
- **🔒 Security**: Ensure safe and reliable transactions
- **🚀 Technology**: Showcase modern backend development practices

---

## ✨ **Core Features**

### 🔐 **Authentication & Security**

- **Firebase Authentication** with email/password and Google sign-in
- **JWT-based API security** for protected routes
- **Role-based access control** for admins, HR, and employees
- **Secure profile management**

### 🛠️ **Payroll & Payment Management**

- **Add Payments**: Admins/HR can create payment records
- **Manage Payroll**: CRUD operations for payroll entries
- **Employee Management**: Add, update, and remove employees
- **Advanced Search**: Search employees, payments, and payroll records

### 📦 **Worksheet System**

- **Track Work Hours**: Employees can log and view worksheets
- **Status Tracking**: Real-time payroll and payment status updates
- **History**: Complete payment and payroll history for all users

### 🎨 **User Experience**

- **RESTful API**: Easy integration with any frontend
- **Error Handling**: Custom error responses and status codes

---

## 🛠️ **Technology Stack**

| Technology         | Version  | Purpose                            |
| ------------------ | -------- | ---------------------------------- |
| **Node.js**        | `Latest` | JavaScript runtime environment     |
| **Express**        | `Latest` | Web application framework          |
| **MongoDB**        | `Latest` | NoSQL database for data storage    |
| **Firebase Admin** | `Latest` | Authentication and user management |

### 🔧 **Development Tools**

- **ESLint** - Code linting and quality
- **Axios** - HTTP client for API calls
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

---

## ⚡ **Quick Start**

### 📋 **Prerequisites**

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** database
- **Firebase** project setup

### 🚀 **Installation**

#### **1. Clone the Repository**

```bash
git clone https://github.com/Programming-Hero-Web-Course4/b11a12-server-side-Purab2001.git
cd paynode_server
```

#### **2. Install Dependencies**

```bash
npm install
```

#### **3. Environment Configuration**

**Server (`.env`):**

```env
DB_USER=your_mongodb_username
DB_PASSWORD=your_mongodb_password
FB_SERVICE_KEY=your_base64_encoded_service_key
PORT=3000
```

#### **4. Run the Server**

```bash
npm start        # Start production server
npm run dev      # Start development server with nodemon
```

---

## 📁 **Project Architecture**

### 🌐 **Server Structure**

```
paynode_server/
├── index.js                 # Express server and API routes
├── package.json             # Server dependencies
├── vercel.json              # Vercel deployment config
├── .env                     # Environment variables
├── config/                  # Database and Firebase config
├── controllers/             # Route controllers
├── middleware/              # Auth and error handling
├── routes/                  # API route definitions
├── services/                # Service logic
```

---

## 📡 **API Overview**

### 🔒 **Authentication Endpoints**

- Authentication handled by **Firebase Auth**
- JWT tokens verified by **Firebase Admin SDK**
- Protected routes require `Authorization: Bearer <token>` header

### 🛠️ **Payroll & Payment Endpoints**

| Method   | Endpoint         | Description          | Auth Required |
| -------- | ---------------- | -------------------- | ------------- |
| `GET`    | `/payments`      | Get all payments     | ✅            |
| `POST`   | `/payments`      | Create payment       | ✅            |
| `GET`    | `/payroll`       | Get payroll records  | ✅            |
| `POST`   | `/payroll`       | Create payroll entry | ✅            |
| `PUT`    | `/payroll/:id`   | Update payroll entry | ✅            |
| `DELETE` | `/payroll/:id`   | Delete payroll entry | ✅            |
| `GET`    | `/employees`     | Get all employees    | ✅            |
| `POST`   | `/employees`     | Add employee         | ✅            |
| `PUT`    | `/employees/:id` | Update employee      | ✅            |
| `DELETE` | `/employees/:id` | Remove employee      | ✅            |
| `GET`    | `/worksheets`    | Get worksheets       | ✅            |
| `POST`   | `/worksheets`    | Add worksheet        | ✅            |

---

## 🚀 **Deployment**

### ⚡ **Server Deployment (Vercel)**

```bash
vercel --prod
```

### 🌍 **Environment Variables**

Ensure all environment variables are properly configured in your deployment platforms:

- **Vercel**: Configure environment variables in Vercel Dashboard
- **MongoDB**: Use MongoDB Atlas for production database
- **Firebase**: Set environment variables in Firebase Console

---

## 🛠️ **Development Scripts**

```bash
npm start        # Start production server
npm run dev      # Start development server with nodemon
```

---

## 📞 **Contact & Connect**

<div align="center">

### 👨‍💻 **Developer Information**

**Abir Shahadat Purab**  
_Mern-Stack Developer & PayNode Creator_

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077b5?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/a-s-purab)
[![Email](https://img.shields.io/badge/Email-Contact-ea4335?style=for-the-badge&logo=gmail)](mailto:a.s.purab0@gmail.com)

</div>

---

## 🙏 **Acknowledgments**

Special thanks to the open-source community and these technologies:

### 🚀 **Core Technologies**

- [**Node.js**](https://nodejs.org/) - JavaScript runtime
- [**Express**](https://expressjs.com/) - Web framework
- [**MongoDB**](https://mongodb.com/) - Database
- [**Firebase**](https://firebase.google.com/) - Authentication & admin
- [**Vercel**](https://vercel.com/) - Deployment platform

---

<div align="center">

### 🌟 **Show Your Support**

If PayNode Server helped you or you found it interesting, please consider:

⭐ **Starring** this repository  
🐛 **Reporting** issues  
💡 **Suggesting** new features  
🤝 **Contributing** to the project  
📢 **Sharing** with others

**Built with ❤️ by [Abir Shahadat Purab](https://www.linkedin.com/in/abir-shahadat-purab-672bab343)**

_PayNode Server - Where Payroll Meets Automation_ 💸✨

</div>
