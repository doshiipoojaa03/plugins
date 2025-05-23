import json
import numpy as np
from pyscript_engineers_web import MidasAPI, Product


def ag_value(seismic_zone, importance_factor):
    if seismic_zone == "1":
        pga_value = 0.4
    elif seismic_zone == "2":
        pga_value = 0.7
    elif seismic_zone == "3":
        pga_value = 1.1
    elif seismic_zone == "4":
        pga_value = 1.6
    elif seismic_zone == "5":
        pga_value = 3.0
    ag_value = pga_value * 0.10197 * importance_factor
    return ag_value

def horizontal_spectrum_parameter(seismic_zone, ground_type):
    zone5 = {
        'A': np.array([1.0, 0.15, 0.4, 2.0]),
        'B': np.array([1.2, 0.15, 0.5, 2.0]),
        'C': np.array([1.15, 0.2, 0.6, 2.0]),
        'D': np.array([1.35, 0.2, 0.8, 2.0]),
        'E': np.array([1.4, 0.15, 0.5, 2.0])
    }
    
    others = {
        'A': np.array([1.0, 0.03, 0.2, 2.5]),
        'B': np.array([1.35, 0.05, 0.25, 2.5]),
        'C': np.array([1.5, 0.06, 0.4, 2.0]),
        'D': np.array([1.6, 0.1, 0.6, 1.5]),
        'E': np.array([1.8, 0.08, 0.45, 1.25])
    }
    
    specturm_params = zone5 if seismic_zone == "5" else others
    soil_factor, tb, tc, td = specturm_params[ground_type]
    return soil_factor, tb, tc, td

def vertical_spectrum_parameter(seismic_zone, importance_factor):
    ag = ag_value(seismic_zone, importance_factor)
    if seismic_zone == "5":
        avg_value = 0.9 * ag
        tvb = 0.15 
        tvc = 0.4
        tvd = 2.0
    else:
        avg_value = 0.8 * ag
        tvb = 0.03
        tvc = 0.2
        tvd = 2.5
    return avg_value, tvb, tvc, tvd

def horizontal_elastic_spectrum(ground_type, seismic_zone, importance_factor, damping_ratio, max_period):
    soil_factor, tb, tc, td = horizontal_spectrum_parameter(seismic_zone, ground_type)
    ag = ag_value(seismic_zone, importance_factor)
    eta = max(0.55, (10 / (5 + damping_ratio / 100)) ** 0.5)
    DATA = []
    mp = max_period
    increment = mp * 1/100
    
    # period 리스트 생성
    periods = []
    p = 0.0
    while p <= mp:
        periods.append(round(p, 5))
        p += increment
    
    # tb, tc, td 값이 없으면 추가
    if tb not in periods:
        periods.append(tb)
    if tc not in periods:
        periods.append(tc)
    if td not in periods:
        periods.append(td)
    
    # 정렬
    periods = sorted(set(periods))
    
    # 스펙트럼 계산
    for p in periods:
        if p <= tb:
            if p == 0:
                cht = ag * soil_factor  # p=0일 때 최소값 설정
            else:
                cht = ag * soil_factor*(1+p/tb*(eta*2.5)-1)
        elif p <= tc:
            cht = ag * soil_factor * eta * 2.5
        elif p <= td:
            cht = ag * soil_factor * eta * 2.5 * (tc/p)
        elif p <= 4.0:
            cht = ag * soil_factor * eta * 2.5 * (tc*td/(p**2))
        else:
            cht = ag * soil_factor * eta * 2.5 * (tc*td/(4**2))
        DATA.append(cht)
    return DATA

def vertical_elastic_spectrum(ground_type, seismic_zone, importance_factor, damping_ratio, max_period):
    ag = ag_value(seismic_zone, importance_factor)
    avg_value, tvb, tvc, tvd = vertical_spectrum_parameter(seismic_zone, importance_factor)
    eta = max(0.55, (10 / (5 + damping_ratio / 100)) ** 0.5)
    DATA = []
    mp = max_period
    increment = mp * 1/100
    p = 0.0
    periods = []
    while p <= mp:
        periods.append(round(p, 5))
        p += increment
    
    # tb, tc, td 값이 없으면 추가
    if tvb not in periods:
        periods.append(tvb)
    if tvc not in periods:
        periods.append(tvc)
    if tvd not in periods:
        periods.append(tvd)
    
    # 정렬
    periods = sorted(set(periods))
    
    for p in periods:
        if p <= tvb:
            if p == 0:
                cht = avg_value  # p=0일 때 최소값 설정
            else:
                cht = avg_value*(1+p/tvb*(eta*3-1))
        elif p <= tvc:
            cht = avg_value * eta * 3
        elif p <= tvd:
            cht = avg_value * eta * 3 * (tvc/p)
        elif p <= 4.0:
            cht = avg_value * eta * 3 * (tvc*tvd/(p**2))
        else:
            cht = avg_value * eta * 3 * (tvc*tvd/(4**2))
        DATA.append(cht)

    return DATA

def horizontal_design_spectrum(ground_type, seismic_zone, importance_factor, behavior_factor, lower_bound_factor, max_period):
    soil_factor, tb, tc, td = horizontal_spectrum_parameter(seismic_zone, ground_type)
    ag = ag_value(seismic_zone, importance_factor)
    DATA = []
    mp = max_period
    increment = mp * 1/100
    # period 리스트 생성
    periods = []
    p = 0.0
    while p <= mp:
        periods.append(round(p, 5))
        p += increment
    
    # tb, tc, td 값이 없으면 추가
    if tb not in periods:
        periods.append(tb)
    if tc not in periods:
        periods.append(tc)
    if td not in periods:
        periods.append(td)
    
    # 정렬
    periods = sorted(set(periods))
    
    for p in periods:
        if p <= tb:
            if p == 0:
                cht = ag*soil_factor*2/3  # p=0일 때 최소값 설정
            else:
                cht = ag*soil_factor*(2/3+(p/tb)*(2.5/behavior_factor-2/3))
        elif p <= tc:
            cht = ag * soil_factor * 2.5/behavior_factor
        elif p <= td:
            cht = max(lower_bound_factor*ag, ag*soil_factor*(2.5/behavior_factor)*(tc/p))
        else:
            cht = max(lower_bound_factor*ag, ag*soil_factor*(2.5/behavior_factor)*(tc*td/(p**2)))
        DATA.append(cht)

    return DATA

def vertical_design_spectrum(ground_type, seismic_zone, importance_factor, behavior_factor, lower_bound_factor, max_period):
    ag = ag_value(seismic_zone, importance_factor)
    avg_value, tvb, tvc, tvd = vertical_spectrum_parameter(seismic_zone, importance_factor)
    DATA = []
    mp = max_period
    increment = mp * 1/100
    
    # period 리스트 생성
    periods = []
    p = 0.0
    while p <= mp:
        periods.append(round(p, 5))
        p += increment
    
    # tvb, tvc, tvd 값이 없으면 추가
    if tvb not in periods:
        periods.append(tvb)
    if tvc not in periods:
        periods.append(tvc)
    if tvd not in periods:
        periods.append(tvd)
    
    # 정렬
    periods = sorted(set(periods))
    
    for p in periods:
        if p <= tvb:
            if p == 0:
                cht = avg_value * 2/3  # p=0일 때 최소값 설정
            else:
                cht = avg_value * (2/3 + (p/tvb) * (2.5/behavior_factor - 2/3))
        elif p <= tvc:
            cht = avg_value * 2.5/behavior_factor
        elif p <= tvd:
            cht = max(lower_bound_factor * avg_value, avg_value * (2.5/behavior_factor) * (tvc/p))
        else:
            cht = max(lower_bound_factor * avg_value, avg_value * (2.5/behavior_factor) * (tvc*tvd/(p**2)))
        DATA.append(cht)
    return DATA

def NF_input(spectrum_type, ground_type, seismic_zone, importance_factor, damping_ratio, behavior_factor, lower_bound_factor, max_period):
    # period 생성
    p = 0
    per_list = []
    while p <= max_period:
        per_list.append(round(p, 5))
        p += max_period * 0.01
    
    # tb, tc, td 값이 없으면 추가
    soil_factor, tb, tc, td = horizontal_spectrum_parameter(seismic_zone, ground_type)
    if tb not in per_list:
        per_list.append(tb)
    if tc not in per_list:
        per_list.append(tc)
    if td not in per_list:
        per_list.append(td)
    
    period = sorted(set(per_list))
    
    # 스펙트럼 타입에 따른 계산
    if spectrum_type == "Horizontal Elastic Spectrum":
        value = horizontal_elastic_spectrum(ground_type, seismic_zone, importance_factor, damping_ratio, max_period)
    elif spectrum_type == "Vertical Elastic Spectrum":
        value = vertical_elastic_spectrum(ground_type, seismic_zone, importance_factor, damping_ratio, max_period)
    elif spectrum_type == "Horizontal Design Spectrum":
        value = horizontal_design_spectrum(ground_type, seismic_zone, importance_factor, behavior_factor, lower_bound_factor, max_period)
    elif spectrum_type == "Vertical Design Spectrum":
        value = vertical_design_spectrum(ground_type, seismic_zone, importance_factor, behavior_factor, lower_bound_factor, max_period)
    
    # period와 value의 길이가 다른 경우 처리
    if len(period) != len(value):
        # 더 긴 쪽을 기준으로 맞춤
        if len(period) > len(value):
            value.extend([value[-1]] * (len(period) - len(value)))
        else:
            period.extend([period[-1]] * (len(value) - len(period)))
    
    return json.dumps({'period': period, 'value': value})



def to_aFUNC(period, value):
    aFUNC = []
    for i in range(len(period)):
        PERIOD = period[i]
        VALUE = value[i]
        aFUNC.append({"PERIOD":PERIOD, "VALUE":VALUE})
    return aFUNC



def UNIT_GET():
    civilApp = MidasAPI(Product.CIVIL, "KR")
    unit = civilApp.db_read("UNIT")
    #유닛에 따른 GRAV 값을 지정합니다.
    dist_unit = unit[1]['DIST']
    GRAV_const = 9.806
    if dist_unit == "M":
        GRAV_const = 9.806
    elif dist_unit == "CM":
        GRAV_const = 980.6
    elif dist_unit == "MM":
        GRAV_const = 9806
    elif dist_unit == "IN":
        GRAV_const = 386.063
    else:
        GRAV_const = 32.1719
    return GRAV_const


# ==================================== RS 입력 ================================== #

def SPFC_UPDATE(ID,name,GRAV, aFUNC):
    civilApp = MidasAPI(Product.CIVIL, "KR")
    data = {
        "NAME": name,
        "DESC": "",
        "iTYPE": 1,
        "iMETHOD": 0,
        "SCALE": 1,
        "GRAV": GRAV,
        "DRATIO": 0.05,
        "STR": {
            "SPEC_CODE": "USER"
        },
        "aFUNC": aFUNC
    }
    civilApp.db_update_item("SPFC", ID, data)
    
    result_message = {"success":"Updating SPFC is completed"}
    return json.dumps(result_message)


def main_NF_EN1998(
    func_name: str,
    spectrum_type: str,
    ground_type: str,
    seismic_zone: str,
    importance_factor: float,
    damping_ratio: float,
    behavior_factor: float,
    lower_bound_factor: float,
    max_period: float
):
    # for graph data
    inputs = json.loads(NF_input(spectrum_type, ground_type, seismic_zone, importance_factor, damping_ratio, behavior_factor, lower_bound_factor, max_period))
    aPeriod = inputs["period"]
    aValue = inputs["value"]
    
    # do SPFC_UPDATE
    civilApp = MidasAPI(Product.CIVIL, "KR")
    ID = civilApp.db_get_next_id("SPFC")
    name = func_name
    aFUNC = to_aFUNC(aPeriod, aValue)
    GRAV = UNIT_GET()
    result = SPFC_UPDATE(ID,name,GRAV, aFUNC)
    return result
