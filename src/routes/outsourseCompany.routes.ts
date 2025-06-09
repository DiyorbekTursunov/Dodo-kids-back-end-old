import { Router } from 'express';
import {
  createOutsourseCompany,
  getAllOutsourseCompanies,
  getOutsourseCompanyById,
  updateOutsourseCompany,
  deleteOutsourseCompany,
} from '../controller/outsourseCompany/outsourse_company.controller';

const router = Router();

router.post('/', createOutsourseCompany);
router.get('/', getAllOutsourseCompanies);
router.get('/:id', getOutsourseCompanyById);
router.put('/:id', updateOutsourseCompany);
router.delete('/:id', deleteOutsourseCompany);

export default router;
