import { Router } from 'express';
import * as issuesController from '../modules/issues/controller.js';
import { authMiddleware, isMaintainer } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, issuesController.createIssue);
router.get('/', issuesController.getAllIssues);
router.get('/:id', issuesController.getSingleIssue);
router.patch('/:id', authMiddleware, issuesController.updateIssue);
router.delete('/:id', authMiddleware, isMaintainer, issuesController.deleteIssue);

export default router;
