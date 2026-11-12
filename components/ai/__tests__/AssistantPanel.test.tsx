import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistantPanel } from '../AssistantPanel';
import { normalizePhones } from '@/lib/normalize';
import raw from '@/data/phones.raw.json';

const phones = normalizePhones(raw).slice(0, 2);
const fetchMock = vi.fn();
const respond = (body: unknown, ok = true) => ({ ok, json: async () => body });

beforeEach(() => { localStorage.clear(); vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
afterEach(() => vi.unstubAllGlobals());

describe('AssistantPanel', () => {
  it.each(['names', 'specs'] as const)('invalidates pending chat when phone %s change, but not when the array is recreated', async change => {
    let finish!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const { rerender } = render(<AssistantPanel phones={phones} onSearch={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Your question or priorities'), { target: { value: 'Compare these phones.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    rerender(<AssistantPanel phones={structuredClone(phones)} onSearch={vi.fn()} />);
    expect(signal.aborted).toBe(false);
    expect(screen.getByText('Compare these phones.')).toBeInTheDocument();

    const changed = phones.map(phone => ({ ...phone, ...(change === 'names' ? { name: `${phone.name} new` } : { batteryMah: phone.batteryMah! + 100 }) }));
    rerender(<AssistantPanel phones={changed} onSearch={vi.fn()} />);
    expect(signal.aborted).toBe(true);
    expect(screen.queryByText('Compare these phones.')).not.toBeInTheDocument();
    expect(screen.getByText(/Phone context changed/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry request' })).not.toBeInTheDocument();
    await act(async () => { finish(respond({ text: 'Stale answer.', sources: [] })); });
    expect(screen.queryByText('Stale answer.')).not.toBeInTheDocument();
    fetchMock.mockResolvedValueOnce(respond({ text: 'Current answer.', sources: [] }));
    fireEvent.change(screen.getByLabelText('Your question or priorities'), { target: { value: 'New question.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await screen.findByText('Current answer.');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ phones: changed, messages: [{ role: 'user', content: 'New question.' }] });
  });

  it.each(['names', 'specs'] as const)('clears populated results when phone %s change while retaining drafts and saved reviews', async change => {
    fetchMock.mockResolvedValueOnce(respond({ primary: { name: phones[0].name, justification: 'Old recommendation.' }, runnerUp: null, sources: [] }))
      .mockResolvedValueOnce(respond({ stores: [], sources: [], message: 'Old store results.' }))
      .mockResolvedValueOnce(respond({ text: 'Old review overview.', sources: [] }));
    const { rerender } = render(<AssistantPanel phones={phones} onSearch={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Your question or priorities'), { target: { value: 'Unsent priorities' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recommend from these phones' }));
    await screen.findByText('Old recommendation.');
    fireEvent.click(screen.getByRole('tab', { name: 'Nearby' }));
    fireEvent.change(screen.getByLabelText('City or area'), { target: { value: 'Lagos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find stores' }));
    await screen.findByText('Old store results.');
    fireEvent.click(screen.getByRole('tab', { name: 'Reviews' }));
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: 'Saved experience.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save review on this browser' }));
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: 'Unsent experience' } });
    fireEvent.click(screen.getByRole('button', { name: 'Research online reviews' }));
    await screen.findByText('Old review overview.');

    const changed = phones.map(phone => ({ ...phone, ...(change === 'names' ? { name: `${phone.name} new` } : { batteryMah: phone.batteryMah! + 100 }) }));
    rerender(<AssistantPanel phones={changed} onSearch={vi.fn()} />);
    expect(screen.queryByText('Old review overview.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Phone model')).toHaveValue(changed[0].name);
    if (change === 'names') {
      expect(screen.queryByText('Saved experience.')).not.toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Phone model'), { target: { value: phones[0].name } });
    }
    expect(screen.getByText('Saved experience.')).toBeInTheDocument();
    expect(screen.getByLabelText('Your review')).toHaveValue('Unsent experience');
    expect(JSON.parse(localStorage.getItem('phoneReviews')!)[phones[0].name]).toHaveLength(1);
    fireEvent.click(screen.getByRole('tab', { name: 'Nearby' }));
    expect(screen.queryByText('Old store results.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('City or area')).toHaveValue('Lagos');
    fireEvent.click(screen.getByRole('tab', { name: 'Chat' }));
    expect(screen.queryByText('Old recommendation.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Your question or priorities')).toHaveValue('Unsent priorities');
  });

  it('invalidates a pending review and its retry when the model is explicitly changed', async () => {
    let finish!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    render(<AssistantPanel phones={phones} onSearch={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Reviews' }));
    fireEvent.click(screen.getByRole('button', { name: 'Research online reviews' }));
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    fireEvent.change(screen.getByLabelText('Phone model'), { target: { value: phones[1].name } });
    expect(signal.aborted).toBe(true);
    await act(async () => { finish(respond({ text: 'Stale review.', sources: [] })); });
    expect(screen.queryByText('Stale review.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry request' })).not.toBeInTheDocument();
    fetchMock.mockResolvedValueOnce(respond({ error: { message: 'Try later.' } }, false));
    fireEvent.click(screen.getByRole('button', { name: 'Research online reviews' }));
    await screen.findByRole('button', { name: 'Retry request' });
    fireEvent.change(screen.getByLabelText('Phone model'), { target: { value: 'Another phone' } });
    expect(screen.queryByRole('button', { name: 'Retry request' })).not.toBeInTheDocument();
    expect(screen.queryByText('Try later.')).not.toBeInTheDocument();
  });

  it('stays offline on mount and tab changes, and supports keyboard tab navigation', () => {
    render(<AssistantPanel phones={phones} onSearch={vi.fn()} />);
    const tab = screen.getByRole('tab', { name: 'Chat' });
    fireEvent.keyDown(tab, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Nearby' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Reviews' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends phone context, history and thinking only when asked; displays source links safely', async () => {
    fetchMock.mockResolvedValue(respond({ text: '**Better battery.**', sources: [{ title: 'Official specs', url: 'https://example.com/specs' }, { title: 'Unsafe', url: 'javascript:alert(1)' }] }));
    render(<AssistantPanel phones={phones} onSearch={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Your question or priorities'), { target: { value: 'Which has better battery?' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Deep thinking/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await screen.findByText('Better battery.');
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/ai/chat');
    expect(JSON.parse(request.body)).toMatchObject({ phones, thinking: true, messages: [{ role: 'user', content: 'Which has better battery?' }] });
    expect(screen.queryByText('Unsafe')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Official specs' })).toHaveAttribute('rel', 'noopener noreferrer');
    fireEvent.change(screen.getByLabelText('Your question or priorities'), { target: { value: 'What about cameras?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).messages).toHaveLength(3);
  });

  it('retries a failed request without duplicating the user message', async () => {
    fetchMock.mockResolvedValueOnce(respond({ error: { message: 'Service temporarily unavailable.' } }, false)).mockResolvedValueOnce(respond({ text: 'Recovered answer.', sources: [] }));
    render(<AssistantPanel phones={phones} onSearch={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Your question or priorities'), { target: { value: 'Help choose.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await screen.findByText('Service temporarily unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry request' }));
    await screen.findByText('Recovered answer.');
    expect(screen.getAllByText('Help choose.')).toHaveLength(1);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).messages).toHaveLength(1);
  });

  it('aborts on cancellation and ignores a late server response', async () => {
    let finish!: (value: unknown) => void;
    fetchMock.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<AssistantPanel phones={phones} onSearch={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Your question or priorities'), { target: { value: 'Help choose.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    fireEvent.click(screen.getByRole('button', { name: 'Cancel request' }));
    expect(signal.aborted).toBe(true);
    finish(respond({ text: 'Late response.', sources: [] }));
    await waitFor(() => expect(screen.getByText(/Request cancelled/)).toBeInTheDocument());
    expect(screen.queryByText('Late response.')).not.toBeInTheDocument();
  });

  it('passes edited requirements to the parent without making an assistant request', () => {
    const search = vi.fn();
    render(<AssistantPanel phones={phones} onSearch={search} />);
    fireEvent.change(screen.getByLabelText('Your question or priorities'), { target: { value: '  Good battery under my budget  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search these requirements' }));
    expect(search).toHaveBeenCalledWith('Good battery under my budget');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('finds stores with manual location and labels missing price/contact honestly', async () => {
    fetchMock.mockResolvedValue(respond({ stores: [{ name: 'Phone shop', placeId: 'one', mapsUrl: 'https://maps.google.com/example', price: null, phoneNumber: null, sources: [] }], sources: [], message: 'Confirm availability.' }));
    render(<AssistantPanel phones={phones} onSearch={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Nearby' }));
    fireEvent.change(screen.getByLabelText('City or area'), { target: { value: 'Ikeja, Lagos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find stores' }));
    await screen.findByText('Phone shop');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ phoneName: phones[0].name, location: 'Ikeja, Lagos' });
    expect(screen.getByText('Not confirmed')).toBeInTheDocument();
    expect(screen.getByText('Not available')).toBeInTheDocument();
  });

  it('continues with GPS coordinates when country lookup has no result', async () => {
    const geolocation = { getCurrentPosition: vi.fn((resolve: (value: unknown) => void) => resolve({ coords: { latitude: 6.6, longitude: 3.3 } })) };
    vi.stubGlobal('navigator', { geolocation });
    fetchMock.mockResolvedValueOnce(respond({ error: { message: 'Country unavailable.' } }, false)).mockResolvedValueOnce(respond({ stores: [], sources: [], message: 'No verified stores.' }));
    render(<AssistantPanel phones={phones} onSearch={vi.fn()} />);
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: 'Nearby' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    await screen.findByText('No verified stores.');
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(['/api/ai/location', '/api/ai/stores']);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ phoneName: phones[0].name, latitude: 6.6, longitude: 3.3 });
  });

  it('keeps local reviews offline until a summary is explicitly requested', async () => {
    fetchMock.mockResolvedValue(respond({ text: 'Review overview.', sources: [] }));
    render(<AssistantPanel phones={phones} onSearch={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Reviews' }));
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: 'Excellent battery, average photos.' } });
    fireEvent.change(screen.getByLabelText('Rating'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save review on this browser' }));
    expect(screen.getByText('4.0 / 5 · 1 review')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('phoneReviews')!)[phones[0].name]).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Summarize saved reviews' }));
    await screen.findByText('Review overview.');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ phoneName: phones[0].name, reviews: [{ author: 'Anonymous', rating: 4, comment: 'Excellent battery, average photos.' }] });
  });
});
