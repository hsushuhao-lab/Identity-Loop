export const IDENTITY_ROUTES=Object.freeze({
  ZHANG:Object.freeze(['ZHANG_OPEN_4F','M2','M1','M4','ZHANG_SECOND_CAMPUS_SECURITY','M5','ZHANG_6F_FORESHADOW','M3','M6','M7','B2','M8','M9']),
  LI:Object.freeze(['M1','M2','M3','M4','M5','M6','M7','B2','M8','M9']),
  ZHOU:Object.freeze(['ZHOU_OPEN_8F','M4','M5','M1','ZHOU_1F_PHOTO','ZHOU_SECURITY_TALK','M3','M2','ZHOU_2117_RETURN','M6','M7','B2','M8','M9']),
  CHEN:Object.freeze(['CHEN_OPEN_SKYBRIDGE','M4','M5','M1','M2','M3','M6','M7','B2','M8','M9'])
});

export const ROUTE_STEPS=Object.freeze({
  ZHANG_OPEN_4F:{zoneId:'first_campus_4f',spawn:'m3_4f_nursing_station',label:'護理站報到',time:'16:50'},
  ZHOU_OPEN_8F:{zoneId:'first_campus_8f',spawn:'m6_8f_bridge_entry',label:'院史長廊',time:'16:50'},
  CHEN_OPEN_SKYBRIDGE:{zoneId:'skybridge',spawn:'m7_skybridge_mid',label:'天橋來電',time:'16:50'},
  M1:{zoneId:'first_campus_3f',spawn:'m0_316_entrance',label:'316 交班',time:'17:00'},
  M2:{zoneId:'first_campus_4f',spawn:'m3_4f_nursing_station',label:'病房查房',time:null},
  M3:{zoneId:'first_campus_2f',spawn:'m4_2f_er_arrival',label:'急診會診',time:null},
  M4:{zoneId:'second_campus_5f',spawn:'second_5f_lift',label:'504B 會診',time:null},
  ZHANG_SECOND_CAMPUS_SECURITY:{zoneId:'second_campus_1f',spawn:'second_1f_lift',label:'警衛室的黑咖啡',time:null},
  M5:{zoneId:'skybridge',spawn:'bridge_from_second',label:'天橋回程',time:null},
  ZHANG_6F_FORESHADOW:{zoneId:'first_campus_8f',spawn:'first_8f_lift',label:'樓層顯示異常',time:null},
  ZHOU_1F_PHOTO:{zoneId:'first_campus_1f',spawn:'first_1f_guard_back',label:'舊照片',time:null},
  ZHOU_SECURITY_TALK:{zoneId:'first_campus_1f',spawn:'first_1f_guard_back',label:'警衛的回憶',time:null},
  ZHOU_2117_RETURN:{zoneId:'first_campus_3f',spawn:'m0_3f_corridor',label:'三樓查哨',time:'21:17'},
  M6:{zoneId:'phantom_6f',spawn:'phantom_6f_lift',label:'錯停的六樓',time:null},
  M7:{zoneId:'first_campus_1f',spawn:'first_1f_guard_back',label:'備援控制盤',time:'02:17'},
  B2:{zoneId:'b2_archive',spawn:'b2_archive_entry',label:'封存隔離層',time:null},
  M8:{zoneId:'first_campus_4f',spawn:'m3_4f_nursing_station',label:'身分拒絕',time:null},
  M9:{zoneId:'first_campus_3f',spawn:'m0_316_office',label:'最後交班',time:null}
});
Object.values(ROUTE_STEPS).forEach(Object.freeze);
