import axios from 'axios';

/**
 * Standard Axios Client for SIMPRU Public / Borrower APIs.
 * Communicates directly with Laravel backend endpoints (/api/...).
 * Rejects errors properly so UI can present appropriate server / network feedback.
 */
const apiClient = axios.create({
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

export default apiClient;
