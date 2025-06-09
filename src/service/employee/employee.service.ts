// employee.service.ts - TypeScript issues fixed
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

if (JWT_SECRET === "default_secret") {
  console.warn(
    "Warning: Using default JWT secret. Please set a secure JWT_SECRET in your environment variables."
  );
}

// Simple error function - no class needed
const throwError = (message: string, statusCode: number): never => {
  const error = new Error(message) as any;
  error.statusCode = statusCode;
  throw error;
};

// Helper function to validate and convert string to userRole enum
const validateUserRole = (role: string): UserRole => {
  const validRoles = Object.values(UserRole);
  if (!validRoles.includes(role as UserRole)) {
    throwError(`Invalid role. Must be one of: ${validRoles.join(", ")}`, 400);
  }
  return role as UserRole;
};

// CREATE - Employee registration
export const createEmployeeService = async (
  login: string,
  password: string,
  role: string,
  departmentId: string,
  name?: string
) => {
  const existingUser = await prisma.user.findUnique({ where: { login } });
  if (existingUser) throwError("Login already taken", 409);

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });
  if (!department) {
    throwError("Department not found", 404);
    return;
  }

  const validatedRole = validateUserRole(role);
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      login,
      password: hashedPassword,
      role: validatedRole,
      employee: {
        create: {
          name: name || department.name, // Use provided name or department name as fallback
          departmentId,
        },
      },
    },
    select: {
      id: true,
      login: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      employee: {
        select: {
          id: true,
          name: true,
          departmentId: true,
          createdAt: true,
          updatedAt: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const token = jwt.sign(
    { userId: newUser.id, role: newUser.role },
    JWT_SECRET
  );

  return {
    message: "Employee registered successfully",
    token,
    user: newUser,
  };
};

// READ - Get all employees
export const getEmployeesService = async (
  page: number = 1,
  limit: number = 10,
  departmentId?: string
) => {
  const skip = (page - 1) * limit;

  const whereClause = departmentId
    ? { employee: { departmentId } }
    : { employee: { isNot: null } }; // Only users who are employees

  const [employees, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      select: {
        id: true,
        login: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
            name: true,
            departmentId: true,
            createdAt: true,
            updatedAt: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  return {
    employees,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
    },
  };
};

// READ - Get employee by ID
export const getEmployeeByIdService = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      login: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      employee: {
        select: {
          id: true,
          name: true,
          departmentId: true,
          createdAt: true,
          updatedAt: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.employee) throwError("Employee not found", 404);
  return user;
};

// UPDATE - Update employee
export const updateEmployeeService = async (
  id: string,
  updateData: {
    departmentId?: string;
    login?: string;
    password?: string;
    role?: string;
    name?: string;
  }
) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { employee: true },
  });

  if (!user || !user.employee) {
    throwError("Employee not found", 404);
    return;
  }

  // Validate department if provided
  if (updateData.departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: updateData.departmentId },
    });
    if (!department) throwError("Department not found", 404);
  }

  // Check if login is already taken by another user
  if (updateData.login && updateData.login !== user.login) {
    const existingUser = await prisma.user.findUnique({
      where: { login: updateData.login },
    });
    if (existingUser) throwError("Login already taken", 409);
  }

  // Validate role if provided
  let validatedRole: UserRole | undefined;
  if (updateData.role) {
    validatedRole = validateUserRole(updateData.role);
  }

  // Hash password if provided
  let hashedPassword: string | undefined;
  if (updateData.password) {
    hashedPassword = await bcrypt.hash(updateData.password, 10);
  }

  // Prepare user update data - Fixed typing
  const userUpdateData: Record<string, any> = {};
  if (updateData.login) userUpdateData.login = updateData.login;
  if (hashedPassword) userUpdateData.password = hashedPassword;
  if (validatedRole) userUpdateData.role = validatedRole;

  // Prepare employee update data - Fixed typing
  const employeeUpdateData: Record<string, any> = {};
  if (updateData.name) employeeUpdateData.name = updateData.name;
  if (updateData.departmentId)
    employeeUpdateData.departmentId = updateData.departmentId;

  // Update in transaction
  const updatedUser = await prisma.$transaction(async (tx) => {
    // Update user if there's user data to update
    if (Object.keys(userUpdateData).length > 0) {
      await tx.user.update({
        where: { id },
        data: userUpdateData,
      });
    }

    // Update employee if there's employee data to update
    if (Object.keys(employeeUpdateData).length > 0) {
      await tx.employee.update({
        where: { userId: id },
        data: employeeUpdateData,
      });
    }

    // Return updated user with employee
    const result = await tx.user.findUnique({
      where: { id },
      select: {
        id: true,
        login: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
            name: true,
            departmentId: true,
            createdAt: true,
            updatedAt: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // This should not happen as we already validated the user exists
    if (!result) throwError("Employee not found after update", 404);
    return result;
  });

  return {
    message: "Employee updated successfully",
    user: updatedUser,
  };
};

// DELETE - Delete employee
export const deleteEmployeeService = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { employee: true },
  });

  if (!user || !user.employee) {
    throwError("Employee not found", 404);
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Delete employee first (due to foreign key constraint)
    await tx.employee.delete({ where: { userId: id } });
    // Then delete user
    await tx.user.delete({ where: { id } });
  });

  return {
    message: "Employee deleted successfully",
    deletedEmployee: {
      id: user.id,
      login: user.login,
      employeeName: user.employee.name,
    },
  };
};

// UTILITY - Get employees by department
export const getEmployeesByDepartmentService = async (departmentId: string) => {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });

  if (!department) {
    throwError("Department not found", 404);
    return;
  }

  const employees = await prisma.user.findMany({
    where: {
      employee: {
        departmentId,
      },
    },
    select: {
      id: true,
      login: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      employee: {
        select: {
          id: true,
          name: true,
          departmentId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: {
      employee: {
        name: "asc",
      },
    },
  });

  return {
    department: {
      id: department.id,
      name: department.name,
    },
    employees,
    count: employees.length,
  };
};

// Error handling middleware - Fixed typing
export const errorHandler = (
  err: any,
  _req: any,
  res: any,
  _next: any
): void => {
  console.error(err.stack);

  // Use the statusCode if it exists, otherwise default to 500
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
