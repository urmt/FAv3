Name:       FedoraAssistant
Version:    3.0
Release:    1%{?dist}
Summary:    Native AI Assistant for Fedora

License:    MIT
URL:        https://github.com/urmt/FAv3
Source0:    %{name}-%{version}.tar.gz

BuildRequires:  gtk4-devel
BuildRequires:  webkit2gtk4.1-devel
BuildRequires:  python3-devel
BuildRequires:  systemd

%description
Standalone AI development assistant with local execution and external LLM consultation.

%prep
%autosetup

%build
# Build React frontend
npm install
npm run build

# Compile native components
gcc -o fedora-assistant src/native-main.c `pkg-config --cflags --libs gtk4 webkit2gtk-4.1`

%install
mkdir -p %{buildroot}/usr/bin
mkdir -p %{buildroot}/usr/share/FedoraAssistant
mkdir -p %{buildroot}/usr/lib/systemd/system

# Install binaries
install -m 755 fedora-assistant %{buildroot}/usr/bin/fedora-assistant

# Install files
cp -r build %{buildroot}/usr/share/FedoraAssistant/public
cp -r src %{buildroot}/usr/share/FedoraAssistant/src
cp -r local-ai-service %{buildroot}/usr/share/FedoraAssistant/

# Install systemd service
install -m 644 local-ai-service/fedora-assistant.service %{buildroot}/usr/lib/systemd/system/

%post
systemctl daemon-reload
systemctl enable fedora-assistant.service

%files
/usr/bin/fedora-assistant
/usr/share/FedoraAssistant
/usr/lib/systemd/system/fedora-assistant.service
