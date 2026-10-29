Pod::Spec.new do |s|
  s.name           = 'WatchConnectivity'
  s.version        = '1.0.0'
  s.summary        = 'A pipe between the phone app and its Apple Watch companion'
  s.description    = 'Sends the workout state to the watch and hands the watch\'s commands to JS. Bluetooth only: no network, no server.'
  s.license        = 'MIT'
  s.author         = 'Wanderlift'
  s.homepage       = 'https://github.com/mattwayles/wanderlift'
  s.platforms      = {
    :ios => '16.4',
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'WatchConnectivity'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
