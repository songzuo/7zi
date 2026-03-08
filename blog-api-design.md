# Blog System RESTful API Design

## Overview
This document outlines the RESTful API design for a blog system with three core components:
1. Article Management
2. Comment System  
3. User Permissions Control

## Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Roles: `reader`, `author`, `admin`

## Core Entities

### User
- id: UUID
- username: string (unique)
- email: string (unique)
- password: hashed string
- role: enum [`reader`, `author`, `admin`]
- created_at: timestamp
- updated_at: timestamp

### Article
- id: UUID
- title: string
- content: text
- slug: string (unique, URL-friendly)
- status: enum [`draft`, `published`, `archived`]
- author_id: UUID (references User)
- published_at: timestamp (nullable)
- created_at: timestamp
- updated_at: timestamp

### Comment
- id: UUID
- content: text
- article_id: UUID (references Article)
- author_id: UUID (references User)
- parent_id: UUID (nullable, for nested comments)
- status: enum [`pending`, `approved`, `rejected`, `spam`]
- created_at: timestamp
- updated_at: timestamp