import { mockParams } from './consts';

interface AppParams {
  /** The record id for the record we are looking at. This could be a process, product & service, etc. */
  id: string;
  /** The type of app we are running. This will be either "resource" or "dependency". This is important
   * because it will determine how we query for related records.
   */
  appTypeIntegrationName: 'EA_SA_Resource' | 'EA_SA_Dependency';
  /** The relationship between the operation section and the type of id defined in the first param.
   * For example, if the first param is a process id, then the relationshipIntegration name would be
   * the relationship integration name between an operation section and a process (EA_SA_rsProcess) */
  relationshipIntegrationName: 'EA_SA_rsProcess' | 'EA_SA_rsProductAndService';
}

export let appParams: AppParams;

if (process.env.NODE_ENV === 'development') {
  appParams = mockParams;
} else {
  /* Get params from data attributes. Information on these is defined above on the type. */

  const el: any = document.querySelector('.react-script');
  const dataParams = el.parentElement.dataset.params;

  const paramId = document.getElementById(dataParams) as HTMLElement;

  const dataRecord = paramId.getAttribute('data-record');
  const recordArr: any = dataRecord?.split('::');

  appParams = {
    id: recordArr[0],
    appTypeIntegrationName: recordArr[1],
    relationshipIntegrationName: recordArr[2],
  };
}
