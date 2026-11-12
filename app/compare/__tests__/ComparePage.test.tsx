import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ComparePage from '@/app/compare/page';

// Mock next-themes to avoid needing a provider
vi.mock('next-themes', () => {
  return {
    useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }),
  };
});

describe('AI research integration (mocked API, not live proof)', () => {
  const phone = {name:'Research Model',price:700000,cpu:'Test chipset',batteryMah:5000,screen:{tech:'OLED',sizeIn:6.5,resolution:'1080x2400'},cameras:{rear:[{mp:50,type:'wide'}],frontMp:12},refreshHz:120,chargingW:45,wirelessW:0,video:'4K',features:{headphone:false,sim:'Dual SIM'}};
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('shows unpriced sourced phones without inventing a zero-price range, winner or plot position', async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({phones:[{...phone,price:null}],evidence:[],sources:[],status:'partial',message:'Specifications sourced; price unavailable.',requestedCount:20,constraintsRelaxed:false})}));
    const user=userEvent.setup(); render(<ComparePage/>);
    await user.type(screen.getByLabelText('What matters in your next phone?'),'Compare real phones without a budget');
    await user.click(screen.getByRole('button',{name:'Find my phones'}));
    await screen.findByText('No sourced prices');
    expect(within(screen.getByRole('table')).getByText('Price unavailable')).toBeInTheDocument();
    expect(screen.getByText('No sourced price')).toBeInTheDocument();
    expect(screen.queryByRole('slider',{name:'Minimum price slider'})).not.toBeInTheDocument();
    expect(screen.getByRole('img',{name:/0 phones plotted by price and battery/})).toBeInTheDocument();
  });

  it('rebuilds filters over generated data and discloses a shortage without padding', async () => {
    const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>({phones:[phone],evidence:[],sources:[],status:'shortage',requestedCount:20,message:'Only one model could be sourced.',constraintsRelaxed:false})});
    vi.stubGlobal('fetch',fetchMock);
    const user=userEvent.setup();
    render(<ComparePage/>);
    await user.type(screen.getByRole('textbox',{name:'Search all specifications'}),'alpha');
    await user.type(screen.getByLabelText('What matters in your next phone?'),'one rare phone');
    await user.click(screen.getByRole('button',{name:'Find my phones'}));
    await screen.findByText('1 sourced phones found. The target is 20.');
    expect(screen.getByText('Only one model could be sourced.')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText(phone.name)).toBeInTheDocument();
    expect(screen.getByRole('checkbox',{name:'Test chipset'})).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({description:'one rare phone',country:'Nigeria',currency:'NGN'});
    await user.click(screen.getByRole('button',{name:'Return to catalog'}));
    expect(within(screen.getByRole('table')).getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByRole('textbox',{name:'Search all specifications'})).toHaveValue('alpha');
    expect(within(screen.getByRole('table')).queryByText('Bravo')).not.toBeInTheDocument();
  });

  it('keeps the current comparison on failure and retries the same request', async () => {
    const fetchMock=vi.fn().mockResolvedValueOnce({ok:false,json:async()=>({error:{message:'Provider quota reached'}})}).mockResolvedValueOnce({ok:true,json:async()=>({phones:[phone],evidence:[],sources:[],status:'partial',message:'Partial research',requestedCount:20,constraintsRelaxed:false})});
    vi.stubGlobal('fetch',fetchMock);
    const user=userEvent.setup(); render(<ComparePage/>);
    await user.type(screen.getByLabelText('What matters in your next phone?'),'camera phone');
    await user.click(screen.getByRole('button',{name:'Find my phones'}));
    await screen.findByText('Provider quota reached');
    expect(within(screen.getByRole('table')).getByText('Alpha')).toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Retry research'}));
    await waitFor(()=>expect(within(screen.getByRole('table')).getByText(phone.name)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts an active search without replacing the current dataset', async () => {
    let requestSignal:AbortSignal|undefined;
    vi.stubGlobal('fetch',vi.fn((_url,options)=>new Promise((_resolve,reject)=>{requestSignal=options.signal;requestSignal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));})));
    const user=userEvent.setup(); render(<ComparePage/>);
    await user.type(screen.getByLabelText('What matters in your next phone?'),'gaming phone');
    await user.click(screen.getByRole('button',{name:'Find my phones'}));
    await user.click(screen.getByRole('button',{name:'Cancel research'}));
    expect(requestSignal?.aborted).toBe(true);
    expect(within(screen.getByRole('table')).getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('uses the explicit research market and keeps currency consistent across the result', async () => {
    const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>({phones:[{...phone,price:600}],evidence:[],sources:[],status:'shortage',requestedCount:20,message:'One result',constraintsRelaxed:false})});
    vi.stubGlobal('fetch',fetchMock);
    const user=userEvent.setup(); render(<ComparePage/>);
    await user.clear(screen.getByLabelText('Country')); await user.type(screen.getByLabelText('Country'),'United States');
    await user.clear(screen.getByLabelText('Currency')); await user.type(screen.getByLabelText('Currency'),'USD');
    await user.type(screen.getByLabelText('What matters in your next phone?'),'camera phone');
    await user.click(screen.getByRole('button',{name:'Find my phones'}));
    await screen.findByText('Price (USD)');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({description:'camera phone',country:'United States',currency:'USD'});
    expect(within(screen.getByRole('table')).getByText('$600')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum price slider')).toHaveAttribute('aria-valuetext','$600');
    fetchMock.mockResolvedValueOnce({ok:true,json:async()=>({text:'Prices use USD.',sources:[]})});
    await user.click(screen.getByRole('button',{name:'Open phone advisor'}));
    await user.type(screen.getByLabelText('Your question or priorities'),'Compare prices');
    await user.click(screen.getByRole('button',{name:'Send question'}));
    await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByText('Prices use USD.');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({currency:'USD',phones:[{...phone,price:600}]});
  });

  it('gives the advisor the selected comparison rather than all filtered models', async () => {
    const user=userEvent.setup(); render(<ComparePage/>);
    await user.click(screen.getByRole('button',{name:'Overview'}));
    await user.click(screen.getByRole('button',{name:'Compare Alpha'}));
    await user.click(screen.getByRole('button',{name:'Compare selected'}));
    expect(within(screen.getByRole('table')).queryByText('Bravo')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Open phone advisor'}));
    expect(screen.getByText('1 phone in context')).toBeInTheDocument();
  });
});

// Provide a tiny, deterministic dataset
vi.mock('@/data/phones.raw.json', () => ({
  default: [
    {
      name: 'Alpha',
      price: 200_000,
      cpu: 'Snapdragon',
      battery: '4500 mAh',
      screen: 'AMOLED',
      rearCam: '50MP (Wide)\n12MP (Ultrawide)',
      frontCam: '32MP',
      refresh: '120Hz',
      size: '6.5"',
      charging: '65W',
      video: '4K',
      wireless: 'Yes (30W)',
      resolution: '1080x2400',
      headphone: 'No',
      sim: 'Dual SIM',
    },
    {
      name: 'Bravo',
      price: 150_000,
      cpu: 'Dimensity',
      battery: '5000 mAh',
      screen: 'OLED',
      rearCam: '64MP (Wide)',
      frontCam: '20MP',
      refresh: '90Hz',
      size: '6.7"',
      charging: '33W',
      video: '4K',
      wireless: 'No',
      resolution: '1440x3200',
      headphone: 'Yes',
      sim: 'Dual SIM',
    },
  ],
}));

const STORAGE_KEY = 'sparta:filters';

describe('ComparePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders and shows table with both phones', () => {
    render(<ComparePage />);
    expect(screen.getByRole('link', { name: 'Sparta Cells home' })).toBeInTheDocument();

    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    // First sticky header is "Specification"
    const headerText = headers.map((h) => h.textContent?.trim());
    expect(headerText).toEqual(expect.arrayContaining(['Specification', 'Alpha', 'Bravo']));
  });

  it('search narrows visible phones and updates cards', async () => {
    const user = userEvent.setup();
    render(<ComparePage />);

    const search = screen.getByRole('textbox', { name: 'Search all specifications' });
    await user.clear(search);
    await user.type(search, 'alpha');

    const table = screen.getByRole('table');
    // Only Alpha column remains
    expect(within(table).queryByText('Bravo')).not.toBeInTheDocument();
    expect(within(table).getByText('Alpha')).toBeInTheDocument();

    // StatCards should reference Alpha somewhere; be tolerant of multiple
    expect(screen.getAllByText(/Alpha/).length).toBeGreaterThan(0);
  });

  it('opens and closes mobile filters', async () => {
    const user = userEvent.setup();
    render(<ComparePage />);
    await user.click(screen.getByRole('button', {name: /^Filters/}));
    expect(screen.getByLabelText('Phone filters')).toHaveClass('sc-filters-open');
    await user.click(screen.getByRole('button', {name: 'Close filters'}));
    expect(screen.getByLabelText('Phone filters')).not.toHaveClass('sc-filters-open');
  });
  it('unmatched specification text shows a useful empty state', async () => {
    const user = userEvent.setup();
    render(<ComparePage />);

    const search = screen.getByRole('textbox', { name: 'Search all specifications' });
    await user.type(search, 'does-not-exist');

    expect(screen.getByText(/No phones match these refinements/i)).toBeInTheDocument();
  });

  it('clear button resets filters including search', async () => {
    const user = userEvent.setup();
    render(<ComparePage />);

    const search = screen.getByRole('textbox', { name: 'Search all specifications' });
    await user.type(search, 'alpha');

    const [clear] = screen.getAllByRole('button', { name: 'Clear' });
    await user.click(clear);
    expect((search as HTMLInputElement).value).toBe('');
  });

  it('persists filters to localStorage and restores on remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ComparePage />);

    const search = screen.getByRole('textbox', { name: 'Search all specifications' });
    await user.type(search, 'alpha');

    // Unmount and re-mount; state should rehydrate from storage
    unmount();
    render(<ComparePage />);

    const restored = screen.getByRole('textbox', { name: 'Search all specifications' }) as HTMLInputElement;
    expect(restored.value.toLowerCase()).toBe('alpha');

    // Sanity: localStorage has the key
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
  });
});
