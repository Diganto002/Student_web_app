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
        },
        StudentAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Token',
          description: 'Student Bearer Authentication Token obtained from /students/login (e.g. student-token-REG1001-...)'
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
        StudentLoginInput: {
          type: 'object',
          required: ['student_id', 'password'],
          properties: {
            student_id: { type: 'string', example: 'REG1001', description: 'Assigned Student ID / Registration ID' },
            password: { type: 'string', example: 'REG1001', description: 'Student password (default is Student ID)' }
          }
        },
        StudentPasswordChangeInput: {
          type: 'object',
          required: ['current_password', 'new_password'],
          properties: {
            current_password: { type: 'string', example: 'REG1001' },
            new_password: { type: 'string', minLength: 6, example: 'Student#2026Pass' }
          }
        },
        CourseRegistrationInput: {
          type: 'object',
          required: ['course_ids'],
          properties: {
            course_ids: {
              type: 'array',
              items: { type: 'integer' },
              example: [1, 2, 3],
              description: 'Array of Course IDs to enroll in (max 15.0 credits total)'
            }
          }
        },
        CourseOfferInput: {
          type: 'object',
          required: ['department', 'semester', 'academic_year', 'course_ids'],
          properties: {
            department: { type: 'string', example: 'CSE' },
            semester: { type: 'string', enum: ['Spring', 'Summer', 'Fall'], example: 'Spring' },
            academic_year: { type: 'string', example: '2026' },
            course_ids: {
              type: 'array',
              items: { type: 'integer' },
              example: [1, 2, 3]
            }
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
            department: { type: 'string', example: 'CSE' },
            semester: { type: 'string', example: 'Spring' },
            academic_year: { type: 'string', example: '2026' },
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
      },
      '/ai/chat': {
        post: {
          summary: 'Chat with AI Admission Assistant (DeepSeek-v4-flash / Groq)',
          tags: ['AI Assistant'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: {
                    message: { type: 'string', example: 'What programs are available for admission?' },
                    provider: { type: 'string', enum: ['deepseek', 'groq'], default: 'groq', example: 'deepseek' },
                    history: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          role: { type: 'string', enum: ['user', 'assistant'] },
                          content: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'AI assistant reply returned' },
            400: { description: 'Validation failure' },
            500: { description: 'Server configuration error' },
            502: { description: 'AI provider error' }
          }
        }
      },
      '/students/login': {
        post: {
          summary: 'Student Portal Login',
          tags: ['Student Portal'],
          description: 'Authenticate approved student using Registration ID and initial or changed password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StudentLoginInput' }
              }
            }
          },
          responses: {
            200: { description: 'Authentication successful. Returns student session token.' },
            401: { description: 'Invalid credentials or unapproved student status.' }
          }
        }
      },
      '/students/change-password': {
        post: {
          summary: 'Student Password Change',
          tags: ['Student Portal'],
          security: [{ StudentAuth: [] }],
          description: 'Change student portal password from initial registration ID to custom password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StudentPasswordChangeInput' }
              }
            }
          },
          responses: {
            200: { description: 'Password updated successfully' },
            400: { description: 'Current password incorrect or validation error' },
            401: { description: 'Unauthorized student token' }
          }
        }
      },
      '/students/me/profile': {
        get: {
          summary: 'Get Current Student Profile',
          tags: ['Student Portal'],
          security: [{ StudentAuth: [] }],
          responses: {
            200: { description: 'Returns student personal and academic details' },
            401: { description: 'Unauthorized student token' }
          }
        }
      },
      '/students/courses/available': {
        get: {
          summary: 'Get Available Courses for Current Student',
          tags: ['Student Portal Course Advising'],
          security: [{ StudentAuth: [] }],
          description: 'Returns offered courses matching the student department, semester, and academic year',
          responses: {
            200: { description: 'List of offered courses with registration eligibility' },
            401: { description: 'Unauthorized' }
          }
        }
      },
      '/students/courses/register': {
        post: {
          summary: 'Submit Semester Course Registration',
          tags: ['Student Portal Course Advising'],
          security: [{ StudentAuth: [] }],
          description: 'Register for selected courses. Enforces departmental offerings and credit limits (max 15.0).',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CourseRegistrationInput' }
              }
            }
          },
          responses: {
            201: { description: 'Course registration completed successfully' },
            400: { description: 'Credit limit exceeded, duplicate registration, or invalid course IDs' }
          }
        }
      },
      '/students/courses/my-registrations': {
        get: {
          summary: 'Get Student Registrations and Advising Slip',
          tags: ['Student Portal Course Advising'],
          security: [{ StudentAuth: [] }],
          responses: {
            200: { description: 'Returns current registrations and course breakdown' }
          }
        }
      },
      '/admin/students/approved': {
        get: {
          summary: 'View Approved Students Roster',
          tags: ['Admin Student Management'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search by name, email, or registration ID' },
            { in: 'query', name: 'department', schema: { type: 'string' }, description: 'Filter by department code (e.g. CSE, SE, EEE)' }
          ],
          responses: {
            200: { description: 'List of approved students' },
            401: { description: 'Unauthorized admin token' }
          }
        }
      },
      '/admin/courses': {
        get: {
          summary: 'List All Master Catalog Courses',
          tags: ['Admin Course Management'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'department', schema: { type: 'string' } }
          ],
          responses: {
            200: { description: 'Course catalog list' }
          }
        },
        post: {
          summary: 'Create New Course in Catalog',
          tags: ['Admin Course Management'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['course_code', 'course_title', 'department'],
                  properties: {
                    course_code: { type: 'string', example: 'CSE 419' },
                    course_title: { type: 'string', example: 'Distributed Systems' },
                    credits: { type: 'number', example: 3.0 },
                    department: { type: 'string', example: 'CSE' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Course created' },
            409: { description: 'Course code already exists' }
          }
        }
      },
      '/admin/courses/offered': {
        get: {
          summary: 'Get Department Semester Course Offerings',
          tags: ['Admin Course Management'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'department', schema: { type: 'string', example: 'CSE' } },
            { in: 'query', name: 'semester', schema: { type: 'string', example: 'Spring' } },
            { in: 'query', name: 'academic_year', schema: { type: 'string', example: '2026' } }
          ],
          responses: {
            200: { description: 'List of offered courses' }
          }
        }
      },
      '/admin/courses/offer': {
        post: {
          summary: 'Assign/Offer Courses to Semester Term',
          tags: ['Admin Course Management'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CourseOfferInput' }
              }
            }
          },
          responses: {
            200: { description: 'Courses offered successfully' }
          }
        }
      },
      '/admin/courses/offered/{id}/toggle': {
        patch: {
          summary: 'Toggle Active Status of Course Offering',
          tags: ['Admin Course Management'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'Offering status toggled' }
          }
        }
      },
      '/students/me/bills': {
        get: {
          summary: 'Get Student Semester Bills and Payment Status',
          tags: ['Student Billing & Fees'],
          security: [{ StudentAuth: [] }],
          responses: {
            200: { description: 'Semester bills and course fee schedule retrieved successfully' }
          }
        }
      },
      '/admin/bills': {
        get: {
          summary: 'List All Student Bills with Financial Metrics',
          tags: ['Admin Billing & Tuition Management'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search by Student ID, name, email' },
            { in: 'query', name: 'department', schema: { type: 'string' } },
            { in: 'query', name: 'payment_status', schema: { type: 'string', enum: ['All', 'Paid', 'Unpaid'] } }
          ],
          responses: {
            200: { description: 'List of student bills and aggregated financial statistics' }
          }
        }
      },
      '/admin/bills/{id}': {
        get: {
          summary: 'Get Specific Student Bill Details and Enrolled Courses',
          tags: ['Admin Billing & Tuition Management'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'Detailed bill breakdown' }
          }
        }
      },
      '/admin/bills/{id}/discount': {
        patch: {
          summary: 'Apply Individual Discount (20%, 40%, 50%, 100%) to Student Bill',
          tags: ['Admin Billing & Tuition Management'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'integer' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['discount_percentage'],
                  properties: {
                    discount_percentage: { type: 'number', example: 40, description: 'Discount percentage (0, 20, 40, 50, 100)' },
                    remarks: { type: 'string', example: 'Merit scholarship waiver' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Discount applied and net payable recalculated successfully' }
          }
        }
      },
      '/admin/bills/{id}/status': {
        patch: {
          summary: 'Update Bill Payment Status (Paid / Unpaid)',
          tags: ['Admin Billing & Tuition Management'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'integer' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['payment_status'],
                  properties: {
                    payment_status: { type: 'string', enum: ['Paid', 'Unpaid'], example: 'Paid' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Payment status updated' }
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
