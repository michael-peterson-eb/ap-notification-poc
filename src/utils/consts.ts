type Params = {
  standaloneMode: boolean;
  id: string;
  planType: string;
  variableSelections: { label: string; value: string }[];
  userDetails: {
    CURR_USER_ROLE_ID: number;
    CURR_USER_ROLE_CODE: string;
  };
  listUsers: string[];
  launchUsers: string[];
};

// Mock params for development
export const mockParams: Params = {
  standaloneMode: false,
  id: '480121753', // plan id in new feature tenant
  planType: 'Crisis Management',
  variableSelections: [
    { label: 'Plan', value: 'Mock Plan Name' },
    { label: 'Plan Type Name', value: 'Mock Plan Type' },
    { label: 'Editors', value: 'Mock User1, Mock User2' },
    { label: 'Workflow Status', value: 'Created' },
  ],
  userDetails: {
    CURR_USER_ROLE_ID: 90,
    CURR_USER_ROLE_CODE: 'administrator',
  },
  listUsers: ['administrator', 'ea_businessadmin', 'ea_itadmin', 'ea_subadmin', 'ea_admin', 'ea_bcplaneditor', 'ea_itplaneditor', 'ea_businessuser', 'ea_ituser'],
  launchUsers: ['administrator', 'ea_businessadmin', 'ea_itadmin', 'ea_subadmin', 'ea_admin', 'ea_bcplaneditor', 'ea_itplaneditor'],
};

function getParamsFromDom(): Params | null {
  if (typeof window === 'undefined') return null;

  const el = document.getElementById('rjs-params');
  const params = el?.dataset.record;

  if (!params) return null;

  const parsed = JSON.parse(params) as Params;

  console.log('Parsed rjs-params:', parsed);

  return parsed;
}

export const params: Params = (() => {
  if (process.env.NODE_ENV === 'development') {
    return mockParams;
  }

  const domParams = getParamsFromDom();

  if (!domParams) {
    throw new Error('Missing rjs-params data-record attribute');
  }

  return domParams;
})();

// Platform URL is arbitrary. It just needs to be a valid page on the target origin.
export const PLATFORM_URL = 'https://eapps-test.eng.infiniteblue.com/prod1/m/main.jsp?view=main&pageId=468987151&objDefId=468975610&tabId=468991376&id=480121753';
export const PLATFORM_ORIGIN = 'https://eapps-test.eng.infiniteblue.com';
