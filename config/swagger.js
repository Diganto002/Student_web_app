const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Student Registration System API - ULAB',
      version: '1.0.0',
      description: 'Comprehensive OpenAPI (Swagger) documentation for Student Registration System at University Of Liberal Arts Bangladesh (ULAB). Features student admission submission, administrative audit workflow, and authentication.',
      contact: {
        name: 'MHDiganto',
        email: 'mhdiganto@gmail.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Server'
      },
      {
        url: '/',
        description: 'Current Host'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Token',
          description: 'Admin Bearer Authentication Token obtained from /admin/login (e.g. admin-token-spetrum-authenticated-2026)'
        }
      },
      schemas: {
        AdminLoginInput: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'spetrum', description: 'Admin username' },
            password: { type: 'string', example: 'admin123', description: 'Admin password' }
          }
        },
        StudentRegistrationInput: {
          type: 'object',
          required: ['first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender', 'address', 'course_name'],
          properties: {
            first_name: { type: 'string', example: 'Mh', description: '2-50 chars, alphabets only' },
            last_name: { type: 'string', example: 'Diganto', description: '2-50 chars, alphabets only' },
            email: { type: 'string', example: 'mhdiganto@gmail.com', description: 'Unique valid email' },
            phone: { type: 'string', example: '01712345678', description: 'Unique 11-digit number' },
            date_of_birth: { type: 'string', format: 'date', example: '2002-10-14', description: 'Past date, Min age 16' },
            gender: { type: 'string', enum: ['Male', 'Female', 'Other'], example: 'Male' },
            address: { type: 'string', example: 'Mohammadpur, Dhaka', description: 'Max 255 chars' },
            course_name: { type: 'string', example: 'Computer Science & Engineering (CSE)', description: 'Selected Program' }
          }
        },
        StudentResponse: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            registration_id: { type: 'string', example: 'REG1001' },
            first_name: { type: 'string', example: 'Mh' },
            last_name: { type: 'string', example: 'Diganto' },
            email: { type: 'string', example: 'mhdiganto@gmail.com' },
            phone: { type: 'string', example: '01712345678' },
            date_of_birth: { type: 'string', example: '2002-10-14' },
            gender: { type: 'string', example: 'Male' },
            address: { type: 'string', example: 'Mohammadpur, Dhaka' },
            course_name: { type: 'string', example: 'Computer Science & Engineering (CSE)' },
            status: { type: 'string', enum: ['Submitted', 'Approved', 'Rejected'], example: 'Approved' },
            created_at: { type: 'string', example: '2026-08-12T13:50:00.000Z' },
            updated_at: { type: 'string', example: '2026-08-12T13:51:00.000Z' }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' }
          }
        }
      }
    },
    paths: {
      '/health': {
        get: {
          summary: 'Server Health Check',
          tags: ['System'],
          responses: {
            200: { description: 'Server is running smoothly' }
          }
        }
      },
      '/admin/login': {
        post: {
          summary: 'Admin Authentication',
          tags: ['Admin Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminLoginInput' }
              }
            }
          },
          responses: {
            200: { description: 'Authentication successful, returns bearer token' },
            401: { description: 'Invalid username or password' }
          }
        }
      },
      '/students': {
        post: {
          summary: 'Submit new student registration',
          tags: ['Students'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StudentRegistrationInput' }
              }
            }
          },
          responses: {
            201: { description: 'Registration created successfully' },
            400: { description: 'Validation failure' },
            409: { description: 'Duplicate email or phone' }
          }
        },
        get: {
          summary: 'List registrations with search, filter, and pagination',
          tags: ['Students'],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Records per page' },
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search REG ID, name, email, or phone' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['All', 'Submitted', 'Approved', 'Rejected'] }, description: 'Filter by application status' }
          ],
          responses: {
            200: { description: 'Paginated list of students' }
          }
        }
      },
      '/students/{id}': {
        get: {
          summary: 'Get registration details and status transition audit history',
          tags: ['Students'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Student ID or Registration ID (e.g. REG1001)' }
          ],
          responses: {
            200: { description: 'Student details and history timeline returned' },
            404: { description: 'Student not found' }
          }
        }
      },
      '/students/{id}/approve': {
        put: {
          summary: 'Approve student application (Admin Only)',
          tags: ['Workflow'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Student ID or Registration ID' }
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    remarks: { type: 'string', example: 'Verified certificates and approved by Admin.' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Application approved successfully' },
            401: { description: 'Unauthorized admin token' },
            400: { description: 'Forbidden status transition (Already finalized)' },
            404: { description: 'Student not found' }
          }
        }
      },
      '/students/{id}/reject': {
        put: {
          summary: 'Reject student application (Admin Only)',
          tags: ['Workflow'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Student ID or Registration ID' }
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    remarks: { type: 'string', example: 'Prerequisite document requirements not met.' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Application rejected' },
            401: { description: 'Unauthorized admin token' },
            400: { description: 'Forbidden status transition (Already finalized)' },
            404: { description: 'Student not found' }
          }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsDoc(options);

function setupSwagger(app) {
  // Swagger UI route
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'ULAB Student Registration API Docs'
  }));

  // Raw OpenAPI spec in JSON format
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  app.get('/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

module.exports = setupSwagger;
