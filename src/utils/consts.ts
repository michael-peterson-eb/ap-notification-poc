// Mock params are for development, feel free to change the id to whatever you are working on. Make sure
// the record id exists in your environment and that the other mock params are set accordingly.
export const mockParams = {
  id: '463589404', // Supply any valid id for testing
  pageId: '7948835',
  appTypeIntegrationName: 'EA_SA_Resource' as const, // 'EA_SA_Resource' | 'EA_SA_Dependency'
  relationshipIntegrationName: 'EA_SA_rsProductAndService' as const, // 'EA_SA_rsProcess' | 'EA_SA_rsProductAndService'
};

// Platform URL is arbitrary. It just needs to be a valid page on the target origin. It can be helpful
// to have it navigate to the page you intend to work with though.
export const PLATFORM_URL = `https://eapps-test.eng.infiniteblue.com/prod3/m/main.jsp?pageId=${mockParams.pageId}&id=${mockParams.id}`;
export const PLATFORM_ORIGIN = 'https://eapps-test.eng.infiniteblue.com';
