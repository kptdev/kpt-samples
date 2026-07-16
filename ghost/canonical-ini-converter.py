import os
import configparser 
import yaml
import io

ORIGIN_CONFIGMAP_FILE_PATH = "mariadb/configmap-mariadb-origin.yaml"
NEW_CONFIGMAP_FILE_PATH = "mariadb/configmap-mariadb.yaml"
INI_FILE_NAME = "my.ini"

def readConfigMap():
    with open(ORIGIN_CONFIGMAP_FILE_PATH, 'r') as stream:
        try:
            return yaml.safe_load(stream)
        except yaml.YAMLError as exc:
            print(exc)
            exit(1)


def writeConfigMap(configMap):
    with io.open(NEW_CONFIGMAP_FILE_PATH, 'w', encoding='utf8') as outfile:
        yaml.dump(configMap, outfile, default_flow_style=False, allow_unicode=True)


def convertINIToMap(iniContent):
    config = configparser.ConfigParser()
    config.read_string(iniContent)
    newMap = {}
    for section in config.sections():
        keyPrefix = 'cm' + '.' +section  # Ues prefix "cm." to distinguish configMap type.  
        for key, value in config[section].items():
            newMap[keyPrefix + '.' + key] = config[section][key]  
    return newMap

if __name__ == "__main__":
    configMap = readConfigMap()
    newMap = convertINIToMap(configMap["data"][INI_FILE_NAME])
    configMap["data"] = newMap
    writeConfigMap(configMap)
