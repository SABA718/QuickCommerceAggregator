// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListPage from './ListPage';
import { ApiError, compareBasket, parseList } from '../api';

vi.mock('../api', async (importOriginal) => ({ ...(await importOriginal()), parseList: vi.fn(), compareBasket: vi.fn() }));
const user = { phoneNumber: '+919876543210' };
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe('shopping list comparison', () => {
  it('requires sign-in before making paid requests', async () => {
    const login = vi.fn();
    render(<ListPage userData={null} onLoginClick={login} />);
    await userEvent.type(screen.getByLabelText('Your grocery list'), 'milk');
    await userEvent.click(screen.getByRole('button', { name: 'Compare list' }));
    expect(login).toHaveBeenCalledOnce();
    expect(parseList).not.toHaveBeenCalled();
  });
  it('parses a list, prevents duplicate submission, and shows incomplete totals', async () => {
    let finish;
    parseList.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    compareBasket.mockResolvedValue({isPending:false, totals:{Blinkit:{totalPrice:25,itemsFound:'1/2',isComplete:false}}});
    render(<ListPage userData={user} onLoginClick={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Your grocery list'), 'milk and bread');
    await userEvent.click(screen.getByRole('button', { name: 'Compare list' }));
    expect(screen.getByRole('button', { name: 'Comparing prices…' }).disabled).toBe(true);
    fireEvent.submit(screen.getByLabelText('Your grocery list').closest('form'));
    expect(parseList).toHaveBeenCalledOnce();
    finish({success:true,items:[{item:'milk',quantity:'1 litre'},{item:'bread',quantity:'1 loaf'}]});
    await screen.findByText(/Incomplete basket/);
    expect(compareBasket).toHaveBeenCalledWith(['milk','bread'],expect.any(AbortSignal));
    expect(screen.getByText(/₹25.00/)).toBeTruthy();
  });
  it('shows errors and opens sign-in when the session expires', async () => {
    const login = vi.fn();
    parseList.mockRejectedValue(new ApiError('Please log in again.',401));
    render(<ListPage userData={user} onLoginClick={login} />);
    await userEvent.type(screen.getByLabelText('Your grocery list'), 'milk');
    await userEvent.click(screen.getByRole('button', { name: 'Compare list' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Please log in again.');
    await waitFor(() => expect(login).toHaveBeenCalledOnce());
    expect(compareBasket).not.toHaveBeenCalled();
  });
  it('polls pending offers and renders the completed basket', async () => {
    parseList.mockResolvedValue({success:true,items:[{item:'milk',quantity:'1 litre'}]});
    compareBasket.mockResolvedValueOnce({isPending:true}).mockResolvedValueOnce({isPending:false,totals:{Zepto:{totalPrice:30,itemsFound:'1/1',isComplete:true}}});
    render(<ListPage userData={user} onLoginClick={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Your grocery list'), 'milk');
    await userEvent.click(screen.getByRole('button', { name: 'Compare list' }));
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(await screen.findByText(/₹30.00/,{}, {timeout:6000})).toBeTruthy();
    expect(compareBasket).toHaveBeenCalledTimes(2);
  }, 8000);
});
