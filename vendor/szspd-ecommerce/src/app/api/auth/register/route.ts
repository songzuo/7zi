import { NextRequest, NextResponse } from 'next/server'
/**
 * Register API endpoint
 * POST /api/auth/register
 *
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: User registration
 *     description: Creates a new user account with email, password, and name.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           examples:
 *             standard:
 *               summary: Standard user registration
 *               value:
 *                 email: newuser@example.com
 *                 password: SecurePass123
 *                 name: John Doe
 *             withRole:
 *               summary: Admin user registration (requires permissions)
 *               value:
 *                 email: admin@example.com
 *                 password: AdminPass123
 *                 name: Admin User
 *                 role: admin
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 *       400:
 *         description: Validation error or registration failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingFields:
 *                 summary: Missing required fields
 *                 value:
 *                   success: false
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Email, password, and name are required
 *               invalidEmail:
 *                 summary: Invalid email format
 *                 value:
 *                   success: false
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Invalid email format
 *               weakPassword:
 *                 summary: Weak password
 *                 value:
 *                   success: false
 *                   error:
 *                     code: WEAK_PASSWORD
 *                     message: Password must be at least 8 characters and contain uppercase, lowercase, and numbers
 *               emailExists:
 *                 summary: Email already registered
 *                 value:
 *                   success: false
 *                   error:
 *                     code: REGISTRATION_FAILED
 *                     message: Email already exists
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: INTERNAL_ERROR
 *                 message: An error occurred during registration
 *
 * @openapi components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User email address (must be unique)
 *           example: newuser@example.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           description: User password (must be at least 8 characters with uppercase, lowercase, and numbers)
 *           pattern: '^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8,}$'
 *           example: SecurePass123
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: User display name
 *           example: John Doe
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           description: User role (may require admin permissions to set)
 *           default: user
 *     RegisterResponse:
 *       type: object
 *       required:
 *         - success
 *         - user
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         user:
 *           $ref: '#/components/schemas/User'
 */

import { registerUser } from '@/lib/auth/service'
import { RegisterRequest } from '@/lib/auth/types'
import { logger } from '@/lib/logger'
import {
  createValidationError,
  createRegistrationFailedError,
  createWeakPasswordError,
  createErrorResponse,
  createConflictError,
} from '@/lib/api/error-handler'
import {
  validateEmail,
  validatePasswordStrength,
  createSuccessResponse,
  setAuthCookies,
} from '@/lib/api/utils'
import { logRequestStart, logRequestComplete, logRequestError } from '@/lib/api/api-logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const metadata = logRequestStart(request)

  try {
    const body = await request.json()

    // Validate request body
    const { email, password, name }: RegisterRequest = body

    if (!email || !password || !name) {
      const response = await createValidationError('Email, password, and name are required')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Validate email format
    if (!validateEmail(email)) {
      const response = await createValidationError('Invalid email format')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Validate password strength
    const passwordCheck = validatePasswordStrength(password)
    if (!passwordCheck.isValid) {
      const response = await createWeakPasswordError(passwordCheck.errors[0])
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Register user
    const result = await registerUser({ email, password, name, role: body.role })

    if (!result.success) {
      // Check if it's a conflict error (email already exists)
      if (result.error?.includes('already') || result.error?.includes('exists')) {
        const response = await createConflictError(result.error || 'Email already exists')
        logRequestComplete(metadata, response, startTime)
        return response
      }

      const response = await createRegistrationFailedError(result.error || 'Registration failed')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Create success response with tokens
    const responseData: {
      user: typeof result.user
      token?: string
      refreshToken?: string | null
      expiresAt?: number
    } = { user: result.user }

    if (result.token) {
      responseData.token = result.token
    }
    // Always include refreshToken (null if not available)
    responseData.refreshToken = result.refreshToken ?? null

    if (result.expiresAt) {
      responseData.expiresAt = result.expiresAt
    }

    const response = createSuccessResponse(responseData, 201)

    // Set auth cookies if tokens are available
    if (result.token && result.refreshToken) {
      setAuthCookies(response, result.token, result.refreshToken, false)
    }

    logger.auth('User registered successfully', {
      requestId: metadata.requestId,
      userId: result.user?.id,
      email: result.user?.email,
    })

    logRequestComplete(metadata, response, startTime)
    return response
  } catch (error) {
    logRequestError(metadata, error, startTime)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}
