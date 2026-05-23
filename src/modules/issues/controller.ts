import { Response } from 'express';
import StatusCode from 'http-status-codes';
import pool from '../../config/database.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { AuthRequest } from '../../middleware/auth.js';

export interface CreateIssueBody {
  title: string;
  description: string;
  type: 'bug' | 'feature_request';
}

export interface UpdateIssueBody {
  title?: string;
  description?: string;
  type?: 'bug' | 'feature_request';
  status?: 'open' | 'in_progress' | 'resolved';
}

interface Issue {
  id: number;
  title: string;
  description: string;
  type: 'bug' | 'feature_request';
  status: 'open' | 'in_progress' | 'resolved';
  reporter_id: number;
  created_at: string;
  updated_at: string;
}

interface ReporterInfo {
  id: number;
  name: string;
  role: string;
}

export const createIssue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, type }: CreateIssueBody = req.body;

    // Validation
    if (!title || !description || !type) {
      sendError(res, 'Title, description, and type are required', undefined, StatusCode.BAD_REQUEST);
      return;
    }

    if (title.length > 150) {
      sendError(res, 'Title must be at most 150 characters', undefined, StatusCode.BAD_REQUEST);
      return;
    }

    if (description.length < 20) {
      sendError(res, 'Description must be at least 20 characters', undefined, StatusCode.BAD_REQUEST);
      return;
    }

    if (!['bug', 'feature_request'].includes(type)) {
      sendError(res, 'Type must be either bug or feature_request', undefined, StatusCode.BAD_REQUEST);
      return;
    }

    // Create issue
    const result = await pool.query(
      'INSERT INTO issues (title, description, type, reporter_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, title, description, type, status, reporter_id, created_at, updated_at',
      [title, description, type, req.user?.id, 'open']
    );

    const issue = result.rows[0] as Issue;

    sendSuccess(res, 'Issue created successfully', issue, StatusCode.CREATED);
  } catch (error) {
    console.error('Create issue error:', error);
    sendError(res, 'Internal server error', undefined, StatusCode.INTERNAL_SERVER_ERROR);
  }
};

export const getAllIssues = async (req: any, res: Response): Promise<void> => {
  try {
    const { sort = 'newest', type, status } = req.query;

    // Build query
    let query = 'SELECT id, title, description, type, status, reporter_id, created_at, updated_at FROM issues WHERE 1=1';
    const params: any[] = [];

    if (type && ['bug', 'feature_request'].includes(type)) {
      query += ' AND type = $' + (params.length + 1);
      params.push(type);
    }

    if (status && ['open', 'in_progress', 'resolved'].includes(status)) {
      query += ' AND status = $' + (params.length + 1);
      params.push(status);
    }

    // Sorting
    if (sort === 'oldest') {
      query += ' ORDER BY created_at ASC';
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const result = await pool.query(query, params);
    const issues = result.rows as Issue[];

    // Fetch reporter details for each issue
    const issuesWithReporter = await Promise.all(
      issues.map(async (issue) => {
        const reporterResult = await pool.query(
          'SELECT id, name, role FROM users WHERE id = $1',
          [issue.reporter_id]
        );
        const reporter = reporterResult.rows[0] as ReporterInfo;

        return {
          ...issue,
          reporter,
        };
      })
    );

    sendSuccess(res, 'Issues retrived successfully', issuesWithReporter);
  } catch (error) {
    console.error('Get all issues error:', error);
    sendError(res, 'Internal server error', undefined, StatusCode.INTERNAL_SERVER_ERROR);
  }
};

export const getSingleIssue = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, title, description, type, status, reporter_id, created_at, updated_at FROM issues WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      sendError(res, 'Issue not found', undefined, StatusCode.NOT_FOUND);
      return;
    }

    const issue = result.rows[0] as Issue;

    // Fetch reporter details
    const reporterResult = await pool.query(
      'SELECT id, name, role FROM users WHERE id = $1',
      [issue.reporter_id]
    );
    const reporter = reporterResult.rows[0] as ReporterInfo;

    sendSuccess(res, 'Issue retrived successfully', {
      ...issue,
      reporter,
    });
  } catch (error) {
    console.error('Get single issue error:', error);
    sendError(res, 'Internal server error', undefined, StatusCode.INTERNAL_SERVER_ERROR);
  }
};

export const updateIssue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, type, status }: UpdateIssueBody = req.body;

    // Get current issue
    const issueResult = await pool.query(
      'SELECT id, title, description, type, status, reporter_id FROM issues WHERE id = $1',
      [id]
    );

    if (issueResult.rows.length === 0) {
      sendError(res, 'Issue not found', undefined, StatusCode.NOT_FOUND);
      return;
    }

    const issue = issueResult.rows[0] as Issue;

    // Check permissions
    const isMaintainer = req.user?.role === 'maintainer';
    const isReporter = issue.reporter_id === req.user?.id;

    if (!isMaintainer && !isReporter) {
      sendError(res, 'You do not have permission to update this issue', undefined, StatusCode.FORBIDDEN);
      return;
    }

    // Contributors can only update their own issues if status is open
    if (!isMaintainer && isReporter && issue.status !== 'open') {
      sendError(res, 'Contributors can only update issues with open status', undefined, StatusCode.CONFLICT);
      return;
    }

    // Validation for fields
    if (title && title.length > 150) {
      sendError(res, 'Title must be at most 150 characters', undefined, StatusCode.BAD_REQUEST);
      return;
    }

    if (description && description.length < 20) {
      sendError(res, 'Description must be at least 20 characters', undefined, StatusCode.BAD_REQUEST);
      return;
    }

    if (type && !['bug', 'feature_request'].includes(type)) {
      sendError(res, 'Type must be either bug or feature_request', undefined, StatusCode.BAD_REQUEST);
      return;
    }

    if (status && !['open', 'in_progress', 'resolved'].includes(status)) {
      sendError(res, 'Status must be one of: open, in_progress, resolved', undefined, StatusCode.BAD_REQUEST);
      return;
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (type !== undefined) {
      updates.push(`type = $${paramCount}`);
      values.push(type);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at, nothing to update
      sendSuccess(res, 'No fields to update', issue);
      return;
    }

    values.push(id);

    const query = `UPDATE issues SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, title, description, type, status, reporter_id, created_at, updated_at`;

    const result = await pool.query(query, values);
    const updatedIssue = result.rows[0] as Issue;

    sendSuccess(res, 'Issue updated successfully', updatedIssue);
  } catch (error) {
    console.error('Update issue error:', error);
    sendError(res, 'Internal server error', undefined, StatusCode.INTERNAL_SERVER_ERROR);
  }
};

export const deleteIssue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if issue exists
    const issueResult = await pool.query('SELECT id FROM issues WHERE id = $1', [id]);

    if (issueResult.rows.length === 0) {
      sendError(res, 'Issue not found', undefined, StatusCode.NOT_FOUND);
      return;
    }

    // Delete issue
    await pool.query('DELETE FROM issues WHERE id = $1', [id]);

    sendSuccess(res, 'Issue deleted successfully');
  } catch (error) {
    console.error('Delete issue error:', error);
    sendError(res, 'Internal server error', undefined, StatusCode.INTERNAL_SERVER_ERROR);
  }
};
