import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from './Pagination';

describe('Pagination', () => {
  it('shows the current range for page 1 of 23 items', () => {
    const { container } = render(<Pagination page={1} pageSize={20} total={23} onPageChange={() => {}} />);
    expect(container.textContent).toMatch(/Showing\s*1–20 of\s*23 listings/);
  });

  it('shows 21–23 on the second page', () => {
    const { container } = render(<Pagination page={2} pageSize={20} total={23} onPageChange={() => {}} />);
    expect(container.textContent).toMatch(/Showing\s*21–23 of\s*23 listings/);
  });

  it('hides page buttons when there is only one page', () => {
    render(<Pagination page={1} pageSize={20} total={10} onPageChange={() => {}} />);
    expect(screen.queryByRole('navigation', { name: 'Listings pagination' })).not.toBeInTheDocument();
  });

  it('calls onPageChange when next is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageSize={20} total={23} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables previous on the first page', () => {
    render(<Pagination page={1} pageSize={20} total={23} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });
});
