/* For Deleted BS and Subscription Records */
var gr = new GlideRecord('sys_audit_delete');
gr.addEncodedQuery('tablename=cmdb_ci_service^ORtablename=cmdb_ci_azure_subscription');
gr.query();
gs.info("Total Row Count "+gr.getRowCount());
var result = [];
var arr = [];
while(gr.next()) {
	var gr3 = new GlideRecord('cmdb_ci_azure_subscription');
	gr3.addEncodedQuery('name='+gr.getValue('display_value'));
	gr3.query();
	if(gr3.next()) {
		if(gr3.getValue('state') == '2') {
			arr.push(gr.getValue('display_value'));
		}
	}

	var gr4 = new GlideRecord('cmdb_ci_service');
	gr4.addEncodedQuery('name='+gr.getValue('display_value'));
	gr4.query();
	if(gr4.next()) {
		if(gr4.getValue('state') == '2') {
			arr.push(gr.getValue('display_value'));
		}
	}
	var gr1 = new GlideRecord('sys_user_group');
	for(var i =0; i < arr.length; i++) {
		gr1.addEncodedQuery('nameLIKE'+arr[i]);
		gr1.query();
		while(gr1.next()) {
			/* For Removal of Group Roles before Deactivating the Group */
			var gr2 = new GlideRecord('sys_group_has_role');
			gr2.addEncodedQuery('group=' + gr1.getUniqueValue());
			gr2.query();
			/* while (gr2.next()) {
				gr2.deleteMultiple();
			} */
			
			/* Group is setting as Inactive */
			result.push(gr1.getValue('name'));
			gr1.setValue('active','false');
			gr1.update();
		}
	}
}
gs.info(result);
gs.info("Result Length "+result.length);

---------------------------------------------------------------------------------------------------------------------------------------------

/* For Disabled Subscription Records */
var gr = new GlideRecord('cmdb_ci_azure_subscription');
gr.addEncodedQuery('state=2');
gr.query();
var result = [];
while(gr.next()) {
	var gr1 = new GlideRecord('sys_user_group');
	gr1.addEncodedQuery('nameLIKE'+gr.getDisplayValue('name'));
	gr1.query();
	while(gr1.next()) {
		/* For Removal of Group Roles before Deactivating the Group */
		var gr2 = new GlideRecord('sys_group_has_role');
		gr2.addEncodedQuery('group=' + gr1.getUniqueValue());
		gr2.query();
		while (gr2.next()) {
			gr2.deleteMultiple();
		}
		
		/* Group is setting as Inactive */
		result.push(gr1.getValue('name'));
		gr1.setValue('active','false');
		gr1.update();
	}
}
gs.info(result);
gs.info("Result Length "+result.length);

---------------------------------------------------------------------------------------------------------------------------------------------

/* For Non-Operational and Retired BS Records */
var gr = new GlideRecord('cmdb_ci_service');
gr.addEncodedQuery('operational_statusIN2,6');
gr.query();
var result = [];
while(gr.next()) {
	var gr1 = new GlideRecord('sys_user_group');
	gr1.addEncodedQuery('nameLIKE'+gr.getDisplayValue('name'));
	gr1.query();
	while(gr1.next()) {
		/* For Removal of Group Roles before Deactivating the Group */
		var gr2 = new GlideRecord('sys_group_has_role');
		gr2.addEncodedQuery('group=' + gr1.getUniqueValue());
		gr2.query();
		while (gr2.next()) {
			gr2.deleteMultiple();
		}
		
		/* Group is setting as Inactive */
		result.push(gr1.getValue('name'));
		gr1.setValue('active','false');
		gr1.update();
	}
}
gs.info(result);
gs.info("Result Length "+result.length);

---------------------------------------------------------------------------------------------------------------------------------------------

/* Updating CI Values SLA, Cost Center and Operation System */
var gr = new GlideRecord('cmdb_ci');
gr.addEncodedQuery('name!=NULL');
gr.query();

var redHat = [];
var windows = [];
var cis = [];

while(gr.next()) {
	var ci_class = gr.getDisplayValue('sys_class_name');
	var ci_sysID = gr.getUniqueValue();
	
	var gr2 = new GlideRecord('cmdb_key_value');
	gr2.addEncodedQuery('key=cost_center^ORkey=msp_sla^configuration_item='+ci_sysID);
	gr2.query();
	
	while(gr2.next()) {
		if(cis.length != 5) {
			var key = gr2.getValue('key');
			var val = gr2.getValue('value');
			if (key == 'msp_sla') {
				gr.u_provider_msp_sla = val;
			}
			if (key == 'cost_center') {
				var gr3 = new GlideRecord('cmn_cost_center');
				gr3.addEncodedQuery('name='+val);
				gr3.query();
				if(gr3.next()) {
					gr.cost_center = gr3.getUniqueValue();
				}
			}
			gr.update();
			cis.push(ci_sysID);
		}
	}
	if(ci_class == 'Virtual Machine Instance') {
		var gr1 = new GlideRecord('cmdb_rel_ci');
		gr1.addEncodedQuery('type=72e003db0b032200639be0d425673aa1^parent='+ci_sysID);
		gr1.query();
		
		while(gr1.next()) {
			if(redHat.length != 5 && windows.length != 5) {
				var child = gr1.getDisplayValue('child').toString().toLowerCase();
				if (child.includes("redhat")) {
					gr1.u_operation_system = "Redhat";
					redHat.push(ci_sysID);
				} else if (child.includes("windows")) {
					gr1.u_operation_system = "Windows";
					windows.push(ci_sysID);
				}
				gr1.update();
			}
		}
	}
}

gs.info("CIS " +cis);
gs.info("Red Hat " +redHat);
gs.info("Windows " +windows);

---------------------------------------------------------------------------------------------------------------------------------------------

/* Subscription Table Report */
var gr = new GlideRecord('cmdb_ci_azure_subscription');
gr.addEncodedQuery('nameISNOTEMPTY');
gr.query();
var i = 0;
var tab;

while(gr.next()) {
	i++;
	var name = gr.getDisplayValue('name');
	var bsUnit = gr.x_delag_cmdb_business_unit.name;
	var costCenterName = gr.cost_center.name;
	var costCenter = gr.cost_center.getRefRecord();
	var responsibleGroup = costCenter.u_delag_responsibles.getRefRecord();
	var manager = responsibleGroup.manager.name;
	var managerSYSID = responsibleGroup.manager;
	var sysID = responsibleGroup.getUniqueValue();
	
	var gr1 = new GlideRecord('sys_user_grmember');
	gr1.addEncodedQuery('group.sys_id='+sysID);
	gr1.query();
	while(gr1.next()) {
		var user = gr1.user.getRefRecord();
		if(user.sys_id != managerSYSID) {
			var contact2 = gr1.user.name;
			break;
		}
	}
	tab = tab+'<tr><td>'+i+'</td><td>'+name+'</td><td>'+bsUnit+'</td><td>'+costCenterName+'</td><td>'+manager+'</td><td>'+contact2+'</td></tr>';

}
gs.info('<table>'+tab+'</table>');
gs.info("Total Row Count "+gr.getRowCount());

--------------------------------------------------------------------------------------------------------------------------------------------

/* Updating PSP Element Value */
var grKey = new GlideRecord('cmdb_key_value');
//grKey.addEncodedQuery('keySTARTSWITHpsp_element^configuration_item.sys_class_name!=^valueISNOTEMPTY^ORvalue!=^ORvalue=NULL^configuration_item!=cac62b9e1b2a04588959bbf1dd4bcb83^ORconfiguration_item=NULL');
grKey.addEncodedQuery('key=psp_element^configuration_item.sys_class_name!=^valueISNOTEMPTY');
grKey.query();

gs.info("Total CIs with PSP "+grKey.getRowCount());

var arr = [];
var i = 0;
while(grKey.next()) {
	var grCMDB = new GlideRecord('cmdb_ci');
	grCMDB.addQuery('sys_id',grKey.configuration_item.sys_id);
	grCMDB.query();		//821
	
	while(grCMDB.next()) {
		if(grCMDB.u_psp == '') {
			grCMDB.u_psp = grKey.value;
			grCMDB.autosysfields(false);
			//grCMDB.update();
			arr.push(grCMDB.getUniqueValue());
			i++;
		}
	}
}

gs.info(arr);
gs.info("I Count " +i);

--------------------------------------------------------------------------------------------------------------------------------------------

/* Deactivating of Users in Dev2 instance */
var gr = new GlideRecord('sys_user');
gr.addEncodedQuery('sys_id!=3b93cb1bdb548c944d21ccd40596198e^sys_id!=5ef3f9781b3fc8d0514f7669cd4bcb7f^sys_id!=91a2228bdbd97f0461c4bd5c6896192e^sys_id!=9afb32c5db037748c2f518fe3b961999^sys_id!=77312b79dbd518107c21ba03f3961980^sys_id!=1a5f8331db9518107c21ba03f39619ad^sys_id!=4f9ddf3ddb9518107c21ba03f3961913^sys_id!=ee654739db5518107c21ba03f3961933^sys_id!=8ee16ff9dbd518107c21ba03f396193b^sys_id!=2a3e43b1db9518107c21ba03f396195c^sys_id!=cc5dc33ddb5518107c21ba03f39619a2^sys_id!=0cee13b1dbd518107c21ba03f3961903^sys_id!=636e1b79dbd518107c21ba03f396197d^sys_id!=58ad0a06db7cb38c89fc6055ca961967^active=true');
gr.query();

var i = 0;

while(gr.next()) {
	gr.active = 'false';
	//gr.update();
	i++;
}
gs.info("Total Users "+i);	//result 125475

--------------------------------------------------------------------------------------------------------------------------------------------

/* Business Service Responsible Group Roles */
var gr = new GlideRecord('sys_user_group');
gr.addEncodedQuery('nameLIKEBusinessService');
gr.query();
var bsGroupNames = [];
while(gr.next()) {
	var gr1 = new GlideRecord('sys_group_has_role');
	gr1.addEncodedQuery('group.sys_id='+gr.getUniqueValue());
	gr1.query();
	
	while(gr1.next()) {
		if((gr1.getDisplayValue('role') != 'delag_business_service_group_user') && (gr1.getDisplayValue('role') != '')) {
			bsGroupNames.push(gr.getUniqueValue());
		}
	}
}

gs.info("BS Group Names "+bsGroupNames);

--------------------------------------------------------------------------------------------------------------------------------------------

/*	Adding Comments for User Profile in Backend	*/
var gr = new GlideRecord('sc_req_item');
gr.addEncodedQuery('cat_item.name=Creation / Deactivation of a ServiceNow User-Account for external Partners');
gr.query();
gs.info("Total Rows "+gr.getRowCount());
var c=0, d=0;
while(gr.next()) {
	var gr1 = new GlideRecord('sys_user');
	gr1.addEncodedQuery('user_name='+gr.variables.user_id.toString());
	gr1.query();
	if(gr1.next()) {
		if(gr.variables.request_type.toString() == 'create') {
			gr1.u_comment = 'User Creation Request Details : '+gr.number;
			c++;
		} else if (gr.variables.request_type.toString() == 'deactivate') {
			if(gr1.getDisplayValue('u_comment') == '') {
				gr1.u_comment = 'User Deactivation Request Details : '+gr.number;
			} else {
				gr1.u_comment = '\nUser Deactivation Request Details : '+gr.number;
			}
			d++;
		}
		gr1.setWorkflow(false);
		gr1.update();
	}
}
gs.info("Total Create Rows "+c);
gs.info("Total Deactivate Rows "+d);

--------------------------------------------------------------------------------------------------------------------------------------------

/*	Clearing of Inactive users from reference fields in backend and item variables	*/

/*	For Backend	User Reference Fields/Variables */
var gr = new GlideRecord('sys_dictionary');
//gr.addEncodedQuery('internal_type=reference^reference=sys_user^reference_qual_condition=NULL');
gr.addEncodedQuery('internal_type=reference^reference=sys_user^reference_qual_condition=NULL^name!=u_cmdb_ci_wide_area_network^name!=core_company^name!=cmn_location');
//gr.addEncodedQuery('sys_idINebeeeac7db411300a4ac03c3ca961920,e2c822e3db31970062c2b29a689619e0');
gr.query();
while(gr.next()) {
	gr.setValue('reference_qual_condition','active=true');
	gr.update();
}

/*	For Portal User Reference Fields/Variables */
var gr = new GlideRecord('item_option_new');
gr.addEncodedQuery('type=8^reference_qual_conditionISEMPTY^reference_qualISEMPTY^active=true^reference=sys_user');
//gr.addEncodedQuery('sys_id=09799befdb5533005bac4cb1159619f1');
gr.query();
while(gr.next()) {
	gr.setValue('reference_qual_condition','active=true');
	gr.update();
}

--------------------------------------------------------------------------------------------------------------------------------------------

/*	Enhancement - ENHC0010516
	Created By Davor
*/
	
/*	Deactivating Non LH Group Users from Dev and UAT which are not logged in from last 3 months and excluding "External Accounts Exclusion" group members */
var gr = new GlideRecord('sys_user');
gr.addEncodedQuery('source=NULL^active=true^last_login<javascript:gs.beginningOfLast3Months()');
gr.query();
var arr = [];
var i = 0;
while (gr.next()) {
    var gr1 = new GlideRecord('sys_user_grmember');
    gr1.addEncodedQuery('group.sys_id=a19d80f1dbdf5c101f0e297cd3961905^user.sys_id=' + gr.getUniqueValue());
    gr1.query();
    if (!gr1.next()) {
        arr.push(gr.user_name.toString());
        gr.active = false;
        gr.update();
        i++;
    }
}
gs.info(gr.getRowCount());
gs.info(arr);

---------------------------------------------------------------------------------------------------------------------------------------------

/*
	Incident : INC0131913
	Updating Incident state as per the state of it's task (incident_task)
*/

var gr, incidentState, i = 0;
var taskState = ['1', '2', '3', '6', '7', '8'];

gr = new GlideRecord('incident_task');
gr.addEncodedQuery('sys_created_by=integration_ibm_servicenow^state=7^incident.stateNOT IN6,7');
gr.query();
gs.print(gr.getRowCount());

while(gr.next()) {
	if(i == 0) {  //This condition allows to update only one record. Please remove this condition to update all records.
		gs.print("Incident is "+gr.incident.number);
		if ((gr.state == taskState[0]) || (gr.state == taskState[1]) || (gr.state == taskState[2])) {
			incidentState = 2; //In Progress
		}
		if ((gr.state == taskState[3]) || (gr.state == taskState[4])) {
			incidentState = 6; //Resolved
		}
		if (gr.state == taskState[5]) {
			incidentState = 8; //Cancelled
		}
		updateIncidentState(incidentState, gr.incident, gr.number);
	}
	i++;
}

function updateIncidentState(incidentState, incident, task) {
    var gr;
    gr = new GlideRecord('incident');
    if (gr.get(incident)) {
        gr.state = incidentState;
		if (incidentState == 6) {
            gr.close_code = 'Solved (Permanently)';
            gr.close_notes = 'The task ' + task + ' is completed. Hence this ticket is resolved.';
        }
        gr.update();
    }
}

---------------------------------------------------------------------------------------------------------------------------------------------

/*	Fetching all active Cost Center groups which are having "approver_user" role */
var result = [];
var gr = new GlideRecord('sys_group_has_role');
gr.addEncodedQuery('role=debab85bff02110053ccffffffffffb6^group.active=true');
gr.query();
gs.print("Row Count "+gr.getRowCount());
while(gr.next()) {
   result.push(gr.group.sys_id);
}

gs.print(result);

/*	Fetching all active Cost Center groups which are doesn't have "approver_user" role */

var gr = new GlideRecord('sys_user_group');
gr.addEncodedQuery('sys_idNOT IN46ab957adb126700a4ac03c3ca96191d,32fb0f751b1ac4107fa3fddacd4bcb97,45ec924ddbcbfb4489fc6055ca961904,8765b44edb36589c192f83840596195a,d5eb5d7adb126700a4ac03c3ca9619d6,cfc52cd8db266b00a4ac03c3ca9619eb,8f877100db3727c0a4ac03c3ca961994,2841d233db722388a4ac03c3ca96191b,a63f18b0db02a7002ad07d7f2996190a,025131f3db9d985021785c77f49619d4,4253f2b3db3af7405bac4cb115961975,94f87dfadba76380a4ac03c3ca961906,9f438ac6dba7ef00a4ac03c3ca9619b4,36e6ac1cdb266b00a4ac03c3ca96192a,9cb2ecbfdb8a4494192f838405961997,9e842fac1b6498187fa3fddacd4bcb54,a819e5c7dbcff38461c4bd5c689619e6,6c2da6f0db2100d8192f838405961939,ecfaa0f2dbf9770061c4bd5c6896196c,f1154151db213f0c61c4bd5c68961990,d298eff5db9fa300a4ac03c3ca961982,8839a53cdb397b0061c4bd5c6896199f,5753600cdb8100505bac4cb1159619e7,9895d436db636f4062c2b29a689619ee,2412fae5db38a814192f838405961978,643aab4cdb83b70c61c4bd5c689619ed,fbcf14f0db02a7002ad07d7f29961930,5b2c993adb126700a4ac03c3ca96199a,c8d9edd8dbdf6f4462c2b29a689619d7,3ac116addb1fff8461c4bd5c689619f4,1cd39908db36bb00e00bd7b7f4961996,3e1ccb6cdb0148504d21ccd4059619a5,ab6ec96d1b991c58f22032649b4bcbdd,624f1cb0db02a7002ad07d7f29961925,b6072c1cdb266b00a4ac03c3ca961980,4f348e1fdb8fa300a4ac03c3ca96199a,c9967148dbf327c0a4ac03c3ca9619ab,724a9ba2db177f4889fc6055ca9619c6,4286a41cdb266b00a4ac03c3ca96199b,f8f1f2e5db38a814192f838405961910,3190a20fdb535014192f8384059619bb,658cd817db37e300a4ac03c3ca9619fc,8079220ddb0ffb4489fc6055ca961912,729fdcb0db02a7002ad07d7f299619d7,8a5f5cb0db02a7002ad07d7f29961952,d22dd7a11b7e80d07fa3fddacd4bcb0b,ff46601cdb266b00a4ac03c3ca9619b7,e10cd1badb126700a4ac03c3ca9619ed,de1d57a11b7e80d07fa3fddacd4bcb85,5d16601cdb266b00a4ac03c3ca96194b,447f9cb0db02a7002ad07d7f299619f0,6070d650dbd73b8461c4bd5c68961966,e909c73edbdfff8889fc6055ca961921,c7f67d4cdbf327c0a4ac03c3ca961914,eed529ee1b5e88107fa3fddacd4bcb08,2fc61dc4dbb1449c192f8384059619c3,d0cf14f0db02a7002ad07d7f29961929,7cf417f3dbcd40905bac4cb1159619ec,f8c912efdbf76700a4ac03c3ca9619fd,8536601cdb266b00a4ac03c3ca9619f6,b3e5eca01bd040d4514f7669cd4bcba7,7ba56c98db266b00a4ac03c3ca9619b6,46936963db36a748a4ac03c3ca9619a1,9b584cb1db8fab4ca4ac03c3ca9619ea,79a9d5fa1b408c50514f7669cd4bcb18,801d17a11b7e80d07fa3fddacd4bcb31,642975fadba76380a4ac03c3ca961926,3eff321d1b6ce4107fa3fddacd4bcb2f,0c6f00a9db3048104d21ccd4059619c5,cc4cd1badb126700a4ac03c3ca961915,c0ac5dbadb126700a4ac03c3ca96198c,8eb55ed3db583300da4da6b605961926,b85d44954a3623120004689b2d5dd60a,845baa5f1b069854514f7669cd4bcbe7,bc2a593adb126700a4ac03c3ca96199d,f2236c0cdb8100505bac4cb115961922,7b4e3a7edbb3a300a4ac03c3ca9619f0,803e4a73dbbeef48a4ac03c3ca961979,b37c1dbadb126700a4ac03c3ca96199e,93f883fadbdfff8889fc6055ca96195e,14e43af0dba6cc14192f83840596191c,d09cd5badb126700a4ac03c3ca961975,1447605cdb266b00a4ac03c3ca961971,874cd5badb126700a4ac03c3ca9619e0,1bdfca751b1c9c107fa3fddacd4bcbc7,650cea5cdb04e4d0192f838405961947,29785c111b4f4c147fa3fddacd4bcbcd,afcb157adb126700a4ac03c3ca9619e0,1401d7b3db6d3f0c89fc6055ca9619e6,382ce036dbf9770061c4bd5c6896194b,a1fdf28a1bb80cd0514f7669cd4bcbaf,10d99503db832bcca4ac03c3ca96192f,a8b602711bd15098f22032649b4bcbc7,693d1ba11b7e80d07fa3fddacd4bcb91,c2b3df00dbb9ff4c89fc6055ca9619a5,06c60b6adb2db30061c4bd5c689619d9,ea3c68dadb239050192f8384059619b9,b4c31f15db07ef0ca4ac03c3ca961972,f8118d1e1be0d810514f7669cd4bcba1,c8f9d9d1db41ff8889fc6055ca9619ca,bdc39cb2db636f4062c2b29a689619dc,8ea27af5db13234062c2b29a6896197d,050f18b0db02a7002ad07d7f29961903,ca27605cdb266b00a4ac03c3ca9619a9,10d31b31db93234062c2b29a68961985,d366e41cdb266b00a4ac03c3ca961945,048f5cb0db02a7002ad07d7f29961909,7ff37eb9db13234062c2b29a68961954,fdfb91badb126700a4ac03c3ca961984,532f98b0db02a7002ad07d7f299619a5,c21c15badb126700a4ac03c3ca96198c,d16d26cbdb9db78489fc6055ca961941,fce6f5c2db22f3c489fc6055ca9619bb,1eb2c4a4dbee6b00a4ac03c3ca96193d,4d07c151db213f0c61c4bd5c68961944,5c677dccdbf327c0a4ac03c3ca9619dd,4bad24f6dbf9770061c4bd5c689619ba,0927bd8cdbf327c0a4ac03c3ca96199c,fc6e4d51dbb36f0062c2b29a6896191e,25292958dbdf6f4462c2b29a6896194a,975dba1cdbd02f00fe5d9785ca961964,6d9df56edbf6f3405bac4cb115961945,9d6264bfdb8a4494192f8384059619a3,d9857b4ddb2e8094192f838405961917,20f5acd8db266b00a4ac03c3ca96197e,46f29c5cdbe0b30089fc6055ca9619f4,0f34beb9db13234062c2b29a6896196f,813cc742db16a70072599eb1ca96194b,fec6e81cdb266b00a4ac03c3ca961975,11ffc0c5db3b270062c2b29a6896190f,2f93b6f5db13234062c2b29a689619a3,1fc9669adb267700e00bd7b7f496190d,eed69dc4dbb1449c192f838405961921,a2d98e8f1bf41c90514f7669cd4bcbdb,b73c1817db37e300a4ac03c3ca96191f,4b752818db266b00a4ac03c3ca9619ed,4cbf90f0db02a7002ad07d7f299619d7,bdd08465dbfc08104d21ccd40596197e,84c00553db5433007c25c4c115961950,e0909ddfdb2d2f801c9f8e68689619c3,04c2833bdb4d40905bac4cb1159619a4,71926cbfdb8a4494192f83840596193a,f9d8713edbb62bc062c2b29a68961949,00d4370adbdea30062c2b29a6896197d^nameLIKECostCenter');
gr.query();
gs.print("Row Count "+gr.getRowCount());
var res = [];
while(gr.next()) {
  res.push(gr.getUniqueValue());
}
gs.print(res);

---------------------------------------------------------------------------------------------------------------------------------------------

/*
	Updating Group Type as "Approval" for all active groups which are having "approver_user" role
*/
var gr = new GlideRecord('sys_group_has_role');
gr.addEncodedQuery('role=debab85bff02110053ccffffffffffb6^group.nameLIKECostCenter');
gr.query();
gs.print("Row Count is :: "+gr.getRowCount());
var arr = [];
var i = 0;
while(gr.next() && i < 2) {
	arr.push(gr.getValue('group'));
	updateGroup(gr.getValue('group'));
	i++;
}
gs.print("Array is :: "+arr);

function updateGroup(group) {
	var groupTypes, gr, approvalType = '4201cd2f1b5d6c145bbf7669cd4bcbd8';
	gr = new GlideRecord('sys_user_group');
	if(gr.get(group)) {
		if(gr.type != '') {
			groupTypes = gr.type.split(',');
			if(groupTypes.indexOf(approvalType) == -1) {
				groupTypes.push(approvalType);
				gr.setValue('type', groupTypes);
				gr.update();
			}
		} else {
			gr.setValue('type', approvalType);
			gr.update();
		}
	}
}

---------------------------------------------------------------------------------------------------------------------------------------------

var gr = new GlideRecord('item_option_new');
gr.addEncodedQuery('referenceINsys_user,sys_user_grmember^active=true^question_text!=NULL');
gr.query();
gs.print(gr.getRowCount());
var arr = [];
while(gr.next()) {
  arr.push(gr.getUniqueValue());
}
gs.print(arr);


---------------------------------------------------------------------------------------------------------------------------------------------

var gr = new GlideRecord('kb_category');
gr.addEncodedQuery('sys_id=0b842bf5db78f490a5320bf5f3961963');
gr.query();
if(gr.next()) {
  gr.deleteMultiple();
}

---------------------------------------------------------------------------------------------------------------------------------------------

if (action == 'adapt_cc') {
	var ga = new GlideAjax('x_delag_sc.delag_HelperUtilAjax');
	ga.addParam('sysparm_name', 'getAllUsersFromCostCentersGroup');
	ga.addParam('sysparm_cost_center', cost_center);
	ga.getXML(fillMembers);
}

var answer = response.responseXML.documentElement.getAttribute('answer');

---------------------------------------------------------------------------------------------------------------------------------------------
/* Enhancement - ENHC0010723
	Description - Updating all KB Questions records with new field value as 'publish'
*/
var gr = new GlideRecord('kb_social_qa_question');
gr.addEncodedQuery('active=true^u_stage=');
//gr.setLimit(1);
gr.query();
gs.info(gr.getRowCount());
while(gr.next()) {
  gs.info(gr.question);
  gr.u_stage = 'publish';
  gr.setWorkflow(false);
  gr.update();
}

---------------------------------------------------------------------------------------------------------------------------------------------
/* Attaching new workflow for existing request */
var gr = new GlideRecord('sc_req_item'); //replace table name
gr.get('sys_id_of_record'); // replace sys_id of record

var workflow = new Workflow();
workflow.cancel(gr);

var newWorkflow = new Workflow();
newWorkflow.startFlow(new Workflow().getWorkflowFromName('Pass workflow name here'), gr, '');


---------------------------------------------------------------------------------------------------------------------------------------------
/* Sys ID of companies which are having LH-Group Company */
var gr = new GlideRecord('core_company');
gr.addEncodedQuery('u_lh_group_company=true');
gr.query();
var arr = [];
gs.info("Total "+gr.getRowCount());
while(gr.next()) {
   arr.push(gr.getUniqueValue().toString());
}
gs.info(arr);


var gr = new GlideRecord('core_company');
gr.addEncodedQuery('u_lh_group_company=no');
gr.query();
gs.info("Row Count "+gr.getRowCount());
var i = 0;
while(gr.next()) {
	i++;
	gr.u_lh_group_company = '';
	gr.setWorkflow(false);
	gr.autosysfields(false);
	gr.update();
}
gs.info("Update Records "+i);


---------------------------------------------------------------------------------------------------------------------------------------------

/* Updating Cost Center with Company info */
var gr = new GlideRecord('sys_user');
gr.addEncodedQuery('active=true^cost_center.nameISNOTEMPTY^company.nameISNOTEMPTY');
gr.query();
gs.info("Row Count " + gr.getRowCount());
var i = 0;
var arr = [];
while (gr.next() && arr.indexOf(gr.cost_center.name) == -1) {
	arr.push(gr.cost_center.name);
    i++;
    updateCostCenter(gr.cost_center.name);
}
gs.info("Cost centers " + arr);

---------------------------------------------------------------------------------------------------------------------------------------------

function updateCostCenter(costCenter) {
    var gr1 = new GlideRecord('cmn_cost_center');
    gr1.addEncodedQuery('name=' + costCenter + '^u_companyISEMPTY^u_business_unitISEMPTY');
    gr1.query();
    if (gr1.next()) {
        gr1.u_company = gr.company;
        var bu = fetchBusinessUnit(gr.company);
        gr1.u_business_unit = bu;
		gr1.setWorkflow(false);
		gr1.autosysfields(false);
        gr1.update();
    }
}

---------------------------------------------------------------------------------------------------------------------------------------------

function fetchBusinessUnit(company) {
    var gr = new GlideRecord('business_unit');
    gr.addEncodedQuery('company.sys_id=' + company);
    gr.query();
    if (gr.next()) {
        return gr.getUniqueValue();
    } else {
        return '';
    }
}

---------------------------------------------------------------------------------------------------------------------------------------------

KB0713029: Using 'gr' as a GlideRecord variable name in custom scripts is always a bad idea
---------------------------------------------------------------------------------------------------------------------------------------------

/* Converting the GMT time to IST time */

var time = new GlideDateTime();
var targetTimezone = 'IST'; // ensure you give correct timezone Abbreviation
var tz = Packages.java.util.TimeZone.getTimeZone(targetTimezone);
time.setTZ(tz);
var timeZoneOffSet = time.getTZOffset();
time.setNumericValue(time.getNumericValue() + timeZoneOffSet);

---------------------------------------------------------------------------------------------------------------------------------------------