import { PrismaClient, Product, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Type for Product with relations (excluding productPacks)
type ProductWithRelations = Product & {
  colors: { id: string; name: string }[];
  sizes: { id: string; name: string }[];
  productGroupFiles: { id: string; file: { id: string; filename: string; path: string } }[];
};

// Input types for create and update
interface CreateProductInput {
  model: string;
  colorIds: string[];
  sizeIds: string[];
  files?: { id: string }[];
}

interface UpdateProductInput {
  model?: string;
  colorIds?: string[];
  sizeIds?: string[];
  files?: { id: string }[];
}

export const createProduct = async (data: CreateProductInput): Promise<ProductWithRelations> => {
  try {
    // Validate input
    if (!data.model) throw new Error('Model is required');
    if (!data.colorIds?.length || !data.sizeIds?.length) {
      throw new Error('At least one color and one size are required');
    }

    return await prisma.product.create({
      data: {
        model: data.model,
        colors: { connect: data.colorIds.map((id) => ({ id })) },
        sizes: { connect: data.sizeIds.map((id) => ({ id })) },
        productGroupFiles: data.files
          ? {
              create: data.files.map((file) => ({
                file: { connect: { id: file.id } },
              })),
            }
          : undefined,
      },
      include: {
        colors: true,
        sizes: true,
        productGroupFiles: { include: { file: true } },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error(`Product with model '${data.model}' already exists`);
      }
      if (error.code === 'P2025') {
        const target = error.meta?.target as string | undefined;
        throw new Error(`Invalid ${target?.includes('color') ? 'color' : target?.includes('size') ? 'size' : 'file'} ID provided`);
      }
    }
    // Cast error to Error for generic cases
    throw new Error(`Failed to create product: ${(error as Error).message || 'Unknown error'}`);
  }
};

export const getAllProducts = async (
  skip: number = 0,
  take: number = 10,
  filter?: { model?: string },
): Promise<{ products: ProductWithRelations[]; total: number }> => {
  try {
    const where: Prisma.ProductWhereInput = filter?.model
      ? { model: { contains: filter.model, mode: 'insensitive' } }
      : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          colors: true,
          sizes: true,
          productGroupFiles: { include: { file: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);
    return { products, total };
  } catch (error) {
    throw new Error(`Failed to fetch products: ${(error as Error).message || 'Unknown error'}`);
  }
};

export const getProductById = async (id: string): Promise<ProductWithRelations> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        colors: true,
        sizes: true,
        productGroupFiles: { include: { file: true } },
      },
    });
    if (!product) {
      throw new Error(`Product with ID ${id} not found`);
    }
    return product;
  } catch (error) {
    throw new Error(`Failed to fetch product: ${(error as Error).message || 'Unknown error'}`);
  }
};

export const updateProduct = async (
  id: string,
  data: UpdateProductInput,
): Promise<ProductWithRelations> => {
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new Error(`Product with ID ${id} not found`);
    }

    const updateData: Prisma.ProductUpdateInput = {
      ...(data.model && { model: data.model }),
      ...(data.colorIds && { colors: { set: data.colorIds.map((id) => ({ id })) } }),
      ...(data.sizeIds && { sizes: { set: data.sizeIds.map((id) => ({ id })) } }),
      ...(data.files && {
        productGroupFiles: {
          deleteMany: {}, // Remove existing files
          create: data.files.map((file) => ({
            file: { connect: { id: file.id } },
          })),
        },
      }),
    };

    return await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        colors: true,
        sizes: true,
        productGroupFiles: { include: { file: true } },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error(`Product with model '${data.model}' already exists`);
      }
      if (error.code === 'P2025') {
        const target = error.meta?.target as string | undefined;
        throw new Error(`Invalid ${target?.includes('color') ? 'color' : target?.includes('size') ? 'size' : 'file'} ID provided`);
      }
    }
    throw new Error(`Failed to update product: ${(error as Error).message || 'Unknown error'}`);
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { productGroupFiles: true },
    });
    if (!product) {
      throw new Error(`Product with ID ${id} not found`);
    }

    await prisma.product.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new Error(`Product with ID ${id} not found`);
    }
    throw new Error(`Failed to delete product: ${(error as Error).message || 'Unknown error'}`);
  }
};
