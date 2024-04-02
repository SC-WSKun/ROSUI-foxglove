export default {
    map_type: {
        0: 'LIDAR_ONLY',
        // 1: 'LIDAR_ORB'
    },
    transform_map: {
        'imu_link': 'imuLinkToBaseLink',
        'laser_link': 'laserLinkToBaseLink',
        'left_wheel': 'leftWheelToBaseLink',
        'right_wheel': 'rightWheelToBaseLink',
        'base_scan': 'baseScanToBaseLink',
        'base_link': 'baseLinkToBaseFootprint',
        'base_footprint': 'baseFootprintToOdom',
        'odom': 'odomToMap'
    }
}
